#!./node_modules/.bin/ts-node --skip-project

import { Config, IConfig } from './config-loader';
import { Logger } from './logger';
import { Executor } from './executor';
import { launchMenu } from './launch-menu';
import * as fs from 'fs';
import * as path from 'path';
import { parseArgs, stringify, Colors } from './common';
import { Scripts } from './scripts';

interface IArgs {
  init: boolean;
  menu: boolean;
  interactive: boolean;
  logLevel: number;
  config: string;

}

function showLoadedFiles(files: string[]) {
  for (const file of files) {
    if (file) {
      const absolutePath = path.resolve(file);

      if (fs.existsSync(absolutePath)) {
        Logger.info('Loaded config: ', absolutePath);
      }
    }
  }
  Logger.info();
}

function createExampleFile(fileName: string, config: Partial<IConfig>): void {
  if (fs.existsSync(fileName)) {
    Logger.error('The file "' + fileName + '" already exists.');
    return;
  }

  fs.writeFileSync(fileName, JSON.stringify(config, null, 2));

  console.log('Created file: ' + fileName);
}

async function main(): Promise<void> {
  let exitCode = 1;

  try {
    let config = Config.load();
    const commandArgs: string[] = process.env.npm_config_argv ? JSON.parse(process.env.npm_config_argv).remain : [];
    const launchArgs = parseArgs<IArgs>(process.argv.slice(2, process.argv.length - commandArgs.length), {
      logLevel: config.options.logLevel,
      init: false,
      menu: false,
      interactive: false,
      config: null,
    });

    Logger.level = launchArgs.logLevel;

    if (launchArgs.config) config = config.merge(launchArgs.config);

    Logger.debug('Config: ', stringify(config));

    showLoadedFiles(config.options.files);

    if (launchArgs.init) {
      createExampleFile('launcher-config.json', Config.initConfig);
      createExampleFile('launcher-menu.json', Config.initMenu);
      return;
    }

    const lifecycleEvent = process.env.npm_lifecycle_event;
    const launchCommand = lifecycleEvent === 'start' ? commandArgs[0] : lifecycleEvent;

    Logger.info(Colors.Bold + 'Date              :', new Date().toISOString() + Colors.Normal);
    Logger.info('Lifecycle event   :', lifecycleEvent);
    Logger.info('Launch command    :', launchCommand);
    Logger.info('Launch arguments  :', launchArgs);

    if (launchCommand === undefined || launchArgs.menu) {
      Logger.info('Command arguments :', commandArgs);
      Logger.info();
      exitCode = await launchMenu(config, commandArgs, launchArgs.interactive);
      return;
    }

    const shell = config.options.script.shell;
    const scripts = config.scripts.find(launchCommand);

    if (scripts.length === 0) throw new Error('Missing launch script: ' + launchCommand);

    const scriptInfo = Scripts.select(scripts);

    commandArgs[0] = Scripts.parse(launchCommand).command;

    scriptInfo.arguments = commandArgs;

    Logger.info('Command arguments :', commandArgs);
    Logger.info();

    const executor = new Executor(shell, process.env, config.scripts);

    exitCode = await executor.execute(scriptInfo);
  } catch (error) {
    Logger.error(`${error}`);
  } finally {
    if (Logger.level < 2) Logger.info('');
    Logger.info('ExitCode:', exitCode);
    process.exit(exitCode);
  }
}

main();
