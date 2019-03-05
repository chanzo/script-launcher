#!./node_modules/.bin/ts-node --skip-project

import * as inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import { Config, ICommand, IMenu, IScript } from './config-loader';
import { Logger } from './logger';
import { Command } from './command';

let defaultPlatform = '';
let defaultEnvironment = '';

enum Colors {
  Bold = '\x1b[1m',
  ResetAll = '\x1b[0m',
  Green = '\x1b[32m',
  Cyan = '\x1b[36m',
}

const configFile = 'custom-launcher.json';

interface ISelection {
  platform: string;
  environment: string;
  autostart: string;
  command: string;
}

interface IConfig {
  default: string;
  platforms: IMenu;
}

export async function launchMenu(): Promise<number> {
  const interactive = process.argv.length >= 3 && process.argv[2].localeCompare('interactive') === 0;
  const config = Config.load();
  const customConfig = loadConfig(configFile);
  const platforms = config.menu;
  let launchCommand = customConfig.default as string;

  Logger.level = config.configurations.logLevel;

  const columns = config.configurations.menu.default.split(':');

  if (columns.length > 0) defaultPlatform = columns[0];
  if (columns.length > 1) defaultEnvironment = columns[1];

  if (interactive || !launchCommand) {
    const combinedPlatforms = { ...platforms, ...customConfig.platforms };
    const selection = await promptMenu(combinedPlatforms);

    if (selection.autostart) {
      console.log();
      console.log('Saving selection in: ' + configFile);

      customConfig.default = selection.command;
      customConfig.platforms = combinedPlatforms;

      saveConfig(configFile, customConfig);
    }
    console.log();

    launchCommand = selection.command;

    Logger.log('Selected command: ', launchCommand);
  }

  const args = process.argv.slice(2);
  const shell = config.configurations.script.shell;
  const environment = { ...process.env };
  const command = new Command(args, environment, config.scripts);
  let script = config.scripts.find(launchCommand);

  if (!script) {
    script = {
      name: '',
      parameters: {},
      command: launchCommand,
    } as IScript;
  }

  // Logger.info('Lifecycle event: ', lifecycleEvent);
  Logger.info('Arguments: ', args);
  // Logger.info('Environment:', script.environment);

  const commands = command.prepare(script);

  return await command.execute(commands, shell);
}

function loadConfig(configFile: string): IConfig {
  try {
    const absolutePath = path.resolve(configFile);

    if (fs.existsSync(absolutePath)) {
      console.log(`${Colors.Bold}Loading custom launch configuration from:${Colors.ResetAll} ${configFile}`);
      console.log();

      return require(absolutePath);
    }

    return {
      default: '',
      platforms: {
        // description: 'main',
      } as IMenu,
    };
  } catch (error) {
    console.error(`${error}`);
    console.error();

    return {
      default: '',
      platforms: {
        // description: 'main',
      } as IMenu,
    };
  }
}

function saveConfig(configFile: string, config: IConfig): void {
  const jsonData = JSON.stringify(config, null, 2);

  fs.writeFile(configFile, jsonData, (err) => {
    if (err) console.log(err);
  });
}

function selectMenuEntry(menu: IMenu): Promise<{ platform: string }> {
  const choices = Object.entries(menu).filter(([entry, subMenu]) => entry !== 'description' && Object.keys(subMenu).length !== 0).map(([choice]) => choice);

  if (choices.length === 0) throw new Error('No menu entries available.');

  if (choices.length === 1) {
    console.log(`${Colors.Green}?${Colors.ResetAll} ${Colors.Bold}Select ${menu.description}:${Colors.ResetAll} ${Colors.Cyan}${choices[0]}${Colors.ResetAll}`);
    return new Promise<{ platform: string }>((resolve, reject) => {
      resolve({
        platform: choices[0],
      });
    });
  }

  return inquirer
    .prompt<{ platform: string }>([
      {
        type: 'list',
        name: 'platform',
        message: `Select ${menu.description}:`,
        default: defaultPlatform,
        choices: choices,
      },
    ]);
}

function promptMenu(menu: IMenu): Promise<ISelection> {

  return new Promise<ISelection>((resolve, reject) => {
    selectMenuEntry(menu)
      .then((answers) => {
        const environments = menu[answers.platform];
        const platform = answers.platform;

        inquirer
          .prompt<{ environment: string, autostart: string }>([
            {
              type: 'list',
              name: 'environment',
              message: `Select ${(environments as IMenu).description}:`,
              default: defaultEnvironment,
              choices: Object.entries(environments).map(([environment]) => environment).filter((entry) => entry !== 'description'),
            },
            {
              type: 'confirm',
              name: 'autostart',
              default: false,
              message: 'Save selection:',
            },
          ])
          .then((answers) => {
            resolve({
              platform: platform,
              environment: answers.environment,
              autostart: answers.autostart,
              command: environments[answers.environment],
            });
          });
      });
  });
}
