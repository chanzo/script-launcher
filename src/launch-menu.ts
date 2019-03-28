import * as inquirer from 'inquirer';
import * as fs from 'fs';
import { Config, IConfig, IMenu } from './config-loader';
import { Executor } from './executor';
import { IScript, IScriptInfo, IScriptTask } from './scripts';
import { Colors } from './common';

export async function launchMenu(config: Config, args: string[], interactive: boolean): Promise<number> {
  let script: IScriptInfo = {
    name: config.options.menu.defaultChoice,
    parameters: {},
    arguments: [],
    script: config.options.menu.defaultScript,
  };

  const executor = new Executor(config.options.script.shell, args, process.env, config.scripts);

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

  return await executor.execute(script);
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

async function promptMenu(menu: IMenu, defaults: string[], choice: string[]): Promise<IScriptInfo> {
  const choices = Object.keys(menu).filter((item) => item !== 'description');

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
      name: choice.join(':'),
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

  return true;
}

function saveCustomConfig(configFile: string, config: IConfig): void {
  const jsonData = JSON.stringify(config, null, 2);

  fs.writeFileSync(configFile, jsonData);
}
