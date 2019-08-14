import * as inquirer from 'inquirer';
import * as fs from 'fs';
import { Config, IConfig, ILaunchSetting, IMenu } from './config-loader';
import { Executor } from './executor';
import { IScript, IScriptInfo, IScriptTask, Scripts } from './scripts';
import { Colors } from './common';

type ChoiceType = { value: string } | string | inquirer.SeparatorOptions;

export async function launchMenu(environment: { [name: string]: string }, settings: ILaunchSetting, config: Config, args: string[], interactive: boolean): Promise<{ startTime: [number, number], exitCode: number }> {
  let script: IScriptInfo = {
    name: config.options.menu.defaultChoice,
    inline: false,
    parameters: {},
    arguments: args,
    script: config.options.menu.defaultScript,
  };
  const shell = Config.evaluateShellOption(config.options.script.shell, true);

  if (interactive || !script.script) {
    const defaultChoice = config.options.menu.defaultChoice.split(':');

    script = await promptMenu(config.menu, defaultChoice, []);

    if (await saveChoiceMenu()) {
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
  } else {
    console.log(Colors.Bold + 'Auto launching: ' + Colors.Normal + script.name);
  }

  console.log();

  const command = getStartCommand(script.script, config.scripts);

  if (command && environment.npm_lifecycle_event === 'start') {
    console.log(Colors.Bold + 'Executing: ' + Colors.Dim + 'npm start ' + script.script + Colors.Normal);
    console.log();
  }

  const executor = new Executor(shell, environment, settings, config.scripts, config.options.glob);

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
  const choice = await inquirer.prompt<{ value: boolean }>([
    {
      type: 'confirm',
      name: 'value',
      default: false,
      message: 'Save selection:',
    },
  ]);

  return choice.value;
}

function createChoices(menu: IMenu): ChoiceType[] {
  const choices: ChoiceType[] = [];

  for (const [name, value] of Object.entries(menu)) {
    if (name !== 'description') {
      if (name === 'separator' && typeof value === 'string') {
        choices.push(new inquirer.Separator(value));
      } else {
        if (Object.keys(value).length !== 0) choices.push(name);
      }
    }
  }

  return choices;
}

async function promptMenu(menu: IMenu, defaults: string[], choice: string[]): Promise<IScriptInfo> {
  const choices = createChoices(menu);

  if (choices.length === 0) throw new Error('No menu entries available.');

  const answer = await inquirer.prompt<{ value: string }>([
    {
      type: 'list',
      name: 'value',
      message: 'Select' + (menu.description ? ' ' + menu.description : '') + ':',
      default: defaults[0],
      choices: choices,
    },
  ]);

  const command = menu[answer.value];

  choice.push(answer.value);

  defaults.shift();

  if (!isMenuObject(command)) {
    return {
      name: 'menu:' + choice.join(':'),
      inline: false,
      parameters: {},
      arguments: [],
      script: command as IScript,
    };
  }

  return promptMenu(command as IMenu, defaults, choice);
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
