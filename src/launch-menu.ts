import * as prompts from 'prompts';
import * as fs from 'fs';
import { Config, IConfig, ILaunchSetting, IMenu } from './config-loader';
import { Executor } from './executor';
import { IScript, IScriptInfo, IScriptTask, Scripts } from './scripts';
import { Colors } from './common';
import { promisify } from 'util';

export async function launchMenu(environment: { [name: string]: string }, settings: ILaunchSetting, config: Config, args: string[], interactive: boolean, timeout: number, testmode: boolean): Promise<{ startTime: [number, number], exitCode: number }> {
  let script: IScriptInfo & { timedout: boolean } = {
    name: config.options.menu.defaultChoice,
    inline: false,
    parameters: {},
    arguments: args,
    script: config.options.menu.defaultScript,
    timedout: false,
  };
  const shell = Config.evaluateShellOption(config.options.script.shell, true);

  if (interactive || !script.script) {
    const pageSize = config.options.menu.pageSize;

    script = await timeoutMenu(config.menu, pageSize, config.options.menu.defaultChoice, timeout);

    if (!script.timedout && await saveChoiceMenu()) {
      saveCustomConfig(config.customFile, {
        menu: {},
        options: {
          menu: {
            defaultChoice: script.name,
            defaultScript: script.script,
          },
        },
      } as IConfig);
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

  const executor = new Executor(shell, environment, settings, config.scripts, config.options.glob, testmode);

  return {
    startTime: executor.startTime,
    exitCode: await executor.execute(script),
  };
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

  if (result.length > 1 || scripts.find(result[0]).length === 0) return null;

  return result[0];
}

async function saveChoiceMenu(): Promise<boolean> {
  const choice = await prompts({
    type: 'confirm',
    name: 'value',
    initial: false,
    message: 'Save selection:',
  });

  return choice.value as boolean;
}

function createChoices(menu: IMenu): prompts.Choice[] {
  const choices: prompts.Choice[] = [];

  for (const [name, value] of Object.entries(menu)) {
    if (name !== 'description') {
      if (name === 'separator' && typeof value === 'string') {
        // choices.push(new inquirer.Separator(value));
      } else {
        if (Object.keys(value).length !== 0) {
          choices.push({
            title: name,
            value: name,
          });
        }
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
    let result = filtered.find(([key, value]) => key === choice);

    if (result === undefined) result = filtered[0];
    if (result === undefined) return '';

    const [key, value] = result;

    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value;

    menu = value as IMenu;

  } while (index < 30);

  return '';
}

function wait(time: number): Promise<void> & { handle: NodeJS.Timeout } {
  let handle: NodeJS.Timeout;
  const promis = new Promise((resolve) => {
    handle = setTimeout(resolve, time);
  }) as Promise<void> & { handle: NodeJS.Timeout };

  promis.handle = handle;

  return promis;
}

async function timeoutMenu(menu: IMenu, pageSize: number, defaultChoice: string, timeout: number): Promise<IScriptInfo & { timedout: boolean }> {
  const choices = defaultChoice.split(':');
  const menuPromise = promptMenu(menu, pageSize, choices, []);
  const promises: Array<Promise<IScriptInfo>> = [menuPromise];
  let waitPromise: Promise<void> & { handle: NodeJS.Timeout };
  let timedout = false;

  if (timeout > 0) {
    const defaultValue = (async () => {
      process.stdin.on('keypress', (char, key) => {
        timeout = Number.MAX_VALUE;
        process.stdout.write('\x1b[s'); // Save cursor position
        console.info();
        console.info();
        process.stdout.write('\x1b[K');
        process.stdout.write('\x1b[u'); // Restore cursor position
      });

      do {
        process.stdout.write('\x1b[s'); // Save cursor position
        console.info();
        console.info();
        process.stdout.write(Colors.Bold + 'Auto select in: ' + Colors.Normal + timeout);
        process.stdout.write('\x1b[u'); // Restore cursor position

        await (waitPromise = wait(1000));

        if (timeout === Number.MAX_VALUE) {
          await (waitPromise = wait(1000 * 60 * 60)); // User pressed a key wait infinite (1 Hour)

          return;
        }

        timeout--;

      } while (timeout > 0);

      console.info();

      timedout = true;

      return {
        name: defaultChoice,
        inline: false,
        parameters: {},
        arguments: [],
        script: getDefaultScript(menu, choices),
      };
    })();

    promises.push(defaultValue);
  }

  const scriptInfo = await Promise.race(promises);

  if (waitPromise) {
    // (menuPromise as any).close();
    clearTimeout(waitPromise.handle);
  }

  await promisify(setTimeout)(10000);

  return {
    ...scriptInfo,
    ...{
      timedout: timedout,
    },
  };
}

function promptMenu(menu: IMenu, pageSize: number, defaults: string[], choice: string[]): Promise<IScriptInfo> & { close: () => void } {
  const choices = createChoices(menu);

  if (choices.length === 0) throw new Error('No menu entries available.');

  const menuPromise = prompts(
    {
      type: 'select',
      name: 'value',
      message: 'Select' + (menu.description ? ' ' + menu.description : '') + ':',
      // initial: defaults[0],
      choices: choices,
      // pageSize: pageSize
    },
  );

  const resultPromise = menuPromise.then((answer) => {
    const command = menu[answer.value];

    choice.push(answer.value);

    defaults.shift();

    if (!isMenuObject(command)) {
      return {
        name: choice.join(':'),
        inline: false,
        parameters: {},
        arguments: [],
        script: command as IScript,
      };
    }

    return promptMenu(command as IMenu, pageSize, defaults, choice);
  }) as Promise<IScriptInfo> & { close: () => void };

  // resultPromise.close = (menuPromise.ui as any).close.bind(menuPromise.ui);

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

function saveCustomConfig(configFile: string, config: IConfig): void {
  const jsonData = JSON.stringify(config, null, 2);

  fs.writeFileSync(configFile, jsonData);
}
