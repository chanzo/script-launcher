#!./node_modules/.bin/ts-node --skip-project

import * as inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import { Config, ICommand, IConfig, IMenu, IScript } from './config-loader';
import { Logger } from './logger';
import { Command } from './command';
import deepmerge = require('deepmerge');

enum Colors {
  Bold = '\x1b[1m',
  ResetAll = '\x1b[0m',
  Green = '\x1b[32m',
  Cyan = '\x1b[36m',
}

export async function launchMenu(): Promise<number> {
  const config = Config.load();

  Logger.level = config.configurations.logLevel;

  const customConfig = loadCustomConfig(config.configurations.menu.customConfig);
  const interactive = process.argv.length >= 3 && process.argv[2].localeCompare('interactive') === 0;
  let script: IScript = {
    name: 'custom launch',
    parameters: {},
    command: customConfig.configurations.menu.defaultScript,
  };

  const command = new Command(config.configurations.script.shell, process.argv, process.env, config.scripts);

  if (interactive || !script.command) {
    const defaultChoice = (customConfig.configurations.menu.defaultChoice ? customConfig.configurations.menu.defaultChoice : config.configurations.menu.defaultChoice).split(':');
    const menu = deepmerge(customConfig.menu, config.menu);

    script = await promptMenu(menu, defaultChoice);

    if (await saveChoiceMenu()) {
      saveCustomConfig(config.configurations.menu.customConfig, {
        menu: {} as IMenu,
        configurations: {
          menu: {
            defaultScript: script.command,
            defaultChoice: '',
          },
        },
      } as IConfig);
    }
  }

  console.log();

  return await command.execute(script);
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

async function promptMenu(menu: IMenu, defaults: string[]): Promise<IScript> {
  const choices = Object.keys(menu).filter((item) => item !== 'description');

  if (choices.length === 0) throw new Error('No menu entries available.');

  const choice = await inquirer.prompt<{ value: string }>([
    {
      type: 'list',
      name: 'value',
      message: 'Select ' + menu.description + ':',
      default: defaults[0],
      choices: choices,
    },
  ]);

  const command = menu[choice.value];

  defaults.shift();

  if (!isMenuObject(command)) {
    return {
      name: 'menu selection',
      parameters: {},
      command: command,
    } as IScript;
  }

  return promptMenu(command as IMenu, defaults);
}

function isMenuObject(object: any) {
  if (object instanceof Array) return false;
  if (typeof object === 'string') return false;
  if ((object as ICommand).concurrent && (object as ICommand).concurrent instanceof Array) return false;
  if ((object as ICommand).sequential && (object as ICommand).sequential instanceof Array) return false;

  return true;
}

function saveCustomConfig(configFile: string, config: IConfig): void {
  const jsonData = JSON.stringify(config, null, 2);

  fs.writeFileSync(configFile, jsonData);
}

function loadCustomConfig(configFile: string): IConfig {
  try {
    const absolutePath = path.resolve(configFile);

    if (fs.existsSync(absolutePath)) {
      console.log(`${Colors.Bold}Loading custom launch configuration from:${Colors.ResetAll} ${configFile}`);

      return require(absolutePath);
    }
  } catch (error) {
    console.error(`${error}`);
    console.error();
  }

  return {
    menu: {},
    configurations: {
      menu: {
        defaultChoice: '',
        defaultScript: '',
      },
    },
  } as IConfig;
}
