import * as prompts from 'prompts';
import * as fs from 'fs';
import { Config, IConfig, ILaunchSetting, IMenu } from './config-loader';
import { Executor } from './executor';
import { IScript, IScriptInfo, IScriptTask, Scripts } from './scripts';
import { confirmPrompt, toPromise, Colors } from './common';
import { SelectPrompt } from 'prompts/lib/elements';

export async function launchMenu(environment: { [name: string]: string }, settings: ILaunchSetting, config: Config, args: string[], interactive: boolean, timeout: number, menuConfirm: boolean, confirm: boolean, testmode: boolean): Promise<{ startTime: [number, number], exitCode: number }> {
  try {
    let script: IScriptInfo & { timedout: boolean } = {
      name: config.options.menu.defaultChoice,
      inline: false,
      multiple: false,
      parameters: {},
      arguments: args,
      script: config.options.menu.defaultScript,
      timedout: false,
    };
    const shell = Config.evaluateShellOption(config.options.script.shell, true);

    if (interactive || !script.script) {
      const pageSize = config.options.menu.pageSize;

      script = await timeoutMenu(config.menu, pageSize, config.options.menu.defaultChoice, timeout);

      if (!script.timedout && menuConfirm && !await confirmPrompt('Are you sure', undefined, true)) {
        return {
          startTime: process.hrtime(),
          exitCode: 0,
        };
      }
      console.log();
    } else {
      console.log(Colors.Bold + 'Auto menu: ' + Colors.Dim + script.name.padEnd(28) + Colors.Normal + Colors.Dim + '  (Use the menu by running:' + Colors.Bold + ' npm start menu' + Colors.Normal + Colors.Dim + ')' + Colors.Normal);
    }

    if (!script.name.startsWith('menu:')) script.name = 'menu:' + script.name;

    const command = getStartCommand(script.script, config.scripts);

    if (command && environment.npm_lifecycle_event === 'start') {
      console.log(Colors.Bold + 'Executing: ' + Colors.Dim + 'npm start ' + script.script + Colors.Normal);
      console.log();
    }

    const executor = new Executor(shell, environment, settings, config.scripts, config.options.glob, confirm, testmode);

    return {
      startTime: executor.startTime,
      exitCode: await executor.execute(script),
    };
  } catch {
    return {
      startTime: [0, 0],
      exitCode: 0,
    };
  }
}

function getStartCommand(script: IScript, scripts: Scripts): string {
  const result = [];

  if ((script as IScriptTask).concurrent) return null;
  if ((script as IScriptTask).sequential) return null;
  if ((script as IScriptTask)['concurrent-then']) return null;
  if ((script as IScriptTask)['sequential-then']) return null;
  if ((script as IScriptTask)['concurrent-else']) return null;
  if ((script as IScriptTask)['sequential-else']) return null;

  if (script instanceof Array) result.push(...script);
  if (typeof script === 'string') result.push(script);
  if (script instanceof String) result.push(script.toString());

  if (result.length !== 1 || scripts.find(result[0]).length === 0) return null;

  return result[0];
}

function getMenuItem(label: string): { name: string, help: string } {
  const match = label.match(/(.*?)\:(.*)$/);

  if (match) {
    return {
      name: match[1],
      help: match[2],
    };
  }

  return {
    name: label,
    help: '',
  };
}

function findMenuItem(menu: IMenu, name: string): IScript | IMenu {
  for (const [label, value] of Object.entries(menu)) {
    const item = getMenuItem(label);

    if (item.name === name) return value;
  }

  return null;
}

function createChoices(menu: IMenu): prompts.Choice[] {
  const choices: prompts.Choice[] = [];
  const menuHelp = {};
  const menuItems = {};

  for (const [name, value] of Object.entries(menu)) {
    if (name !== 'description') {
      const item = getMenuItem(name);

      menuHelp[item.name] = item.help;
      menuItems[item.name] = value;
    }
  }

  for (const [name, value] of Object.entries(menuItems)) {
    if (name === 'separator' && typeof value === 'string') {
      // Separator not supported by prompts
    } else {
      if (Object.keys(value).length !== 0) {
        choices.push({
          title: name,
          value: name,
          description: menuHelp[name],
        } as any);
      }
    }
  }

  return choices;
}

function getDefaultScript(menu: IMenu, choices: string[]): IScript {
  let index = 0;

  do {
    const filtered = Object.entries(menu).filter(([key, value]) => key !== 'description' && key !== 'separator' && !!value && Object.entries(value).length > 0);

    const choice = choices[index++];
    let result = filtered.find(([label, value]) => getMenuItem(label).name === choice);

    if (result === undefined) result = filtered[0];
    if (result === undefined) return '';

    const [key, value] = result;

    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value;

    menu = value as IMenu;

  } while (index < 30);

  return '';
}

async function timeoutMenu(menu: IMenu, pageSize: number, defaultChoice: string, timeout: number): Promise<IScriptInfo & { timedout: boolean }> {
  let menuPromise: Promise<IScriptInfo> & { close: () => void };
  let timeoutId: NodeJS.Timeout = null;
  let currentTimeout = timeout;

  if (currentTimeout > 0) {
    timeoutId = setInterval(() => {

      if (--currentTimeout > 0) {
        process.stdout.write('\x1b[s'); // Save cursor position

        console.info();

        process.stdout.write(Colors.Bold + 'Auto select in: ' + Colors.Normal + currentTimeout);
        process.stdout.write('\x1b[u'); // Restore cursor position

        return;
      }

      clearTimeout(timeoutId);

      timeoutId = null;

      menuPromise.close();
    }, 1000);

    const listener = (char, key) => {
      clearTimeout(timeoutId);

      if (currentTimeout !== timeout) {
        process.stdout.write('\x1b[s'); // Save cursor position

        console.info();

        process.stdout.write('\x1b[K');
        process.stdout.write('\x1b[u'); // Restore cursor position
      }

      process.stdin.removeListener('keypress', listener);
    };

    process.stdin.on('keypress', listener);
  }

  try {
    const defaults = defaultChoice.split(':');
    menuPromise = promptMenu(menu, pageSize, defaults, []);
    const scriptInfo = await menuPromise;

    if (scriptInfo === null) {
      return {
        name: defaultChoice,
        inline: false,
        multiple: false,
        parameters: {},
        arguments: [],
        script: getDefaultScript(menu, defaults),
        timedout: true,
      };
    }

    return {
      ...scriptInfo,
      ...{
        timedout: false,
      },
    };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function promptMenu(menu: IMenu, pageSize: number, defaults: string[], choice: string[]): Promise<IScriptInfo> & { close: () => void } {
  const choices = createChoices(menu);
  let close = false;

  defaults = [...defaults];

  if (choices.length === 0) {
    console.log('Nothing to do: Menu not available and no action specified.');
    throw new Error('Nothing to do: Menu not available and no action specified.');
  }

  let initialIndex = choices.findIndex((item) => item.title === defaults[0]);

  if (initialIndex === -1) initialIndex = 0;

  const selectMenu = new SelectPrompt(
    {
      type: 'select',
      name: 'value',
      message: 'Select' + (menu.description ? ' ' + menu.description : ''),
      initial: initialIndex,
      choices: choices,
    },
  );
  const menuPromise = toPromise(selectMenu);

  const resultPromise = menuPromise.then((answer) => {
    if (close || answer.length === 0) return null;

    const menuItem = findMenuItem(menu, answer[0]);

    if (menuItem === null) {
      const message = 'Menu item not found!';

      console.log(Colors.Bold + Colors.Red + message + Colors.Normal);

      throw new Error(message);
    }

    choice.push(answer[0]);

    defaults.shift();

    if (!isMenuObject(menuItem)) {
      return {
        name: choice.join(':'),
        inline: false,
        circular: false,
        multiple: false,
        parameters: {},
        arguments: [],
        script: menuItem as IScript,
      };
    }

    return promptMenu(menuItem as IMenu, pageSize, defaults, choice);
  }) as Promise<IScriptInfo> & { close: () => void };

  resultPromise.close = () => {
    close = true;
    selectMenu.submit();
  };

  return resultPromise;
}

function isMenuObject(object: any) {
  if (object instanceof Array) return false;
  if (typeof object === 'string') return false;

  if ((object as IScriptTask).concurrent && (object as IScriptTask).concurrent instanceof Array) return false;
  if ((object as IScriptTask).sequential && (object as IScriptTask).sequential instanceof Array) return false;
  if ((object as IScriptTask)['concurrent-then'] && (object as IScriptTask)['concurrent-then'] instanceof Array) return false;
  if ((object as IScriptTask)['sequential-then'] && (object as IScriptTask)['sequential-then'] instanceof Array) return false;
  if ((object as IScriptTask)['concurrent-else'] && (object as IScriptTask)['concurrent-else'] instanceof Array) return false;
  if ((object as IScriptTask)['sequential-else'] && (object as IScriptTask)['sequential-else'] instanceof Array) return false;

  return true;
}
