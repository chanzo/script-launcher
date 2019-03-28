#!./node_modules/.bin/ts-node --skip-project

import { Config } from './config-loader';
import { Logger } from './logger';
import { Executor } from './executor';
import { launchMenu } from './launch-menu';
import * as fs from 'fs';
import * as path from 'path';
import { stringify, Colors } from './common';

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

async function main(): Promise<void> {
  let exitCode = 1;

  try {
    const config = Config.load();

    Logger.level = config.options.logLevel;

    Logger.debug('Config: ', stringify(config));

    showLoadedFiles(config.options.files);

    const lifecycleEvent = process.env.npm_lifecycle_event;
    const commandArgs: string[] = process.env.npm_config_argv ? JSON.parse(process.env.npm_config_argv).remain : [];
    const scriptArgs = process.argv.slice(2, process.argv.length - commandArgs.length);
    const launchCommand = lifecycleEvent === 'start' ? commandArgs[0] : lifecycleEvent;
    const interactive = `${scriptArgs}` === 'interactive';

    if (`${scriptArgs}` === 'init') {
      const targetFile = 'launcher-config.json';

      if (fs.existsSync(targetFile)) {
        Logger.error('The file "' + targetFile + '" already exists.');
        return;
      }

      fs.writeFileSync(targetFile, JSON.stringify(Config.init, null, 2));

      return;
    }

    Logger.info(Colors.Bold + 'Date              :', new Date().toISOString() + Colors.Normal);
    Logger.info('Lifecycle event   :', lifecycleEvent);
    Logger.info('Launch command    :', launchCommand);
    Logger.info('Launch arguments  :', scriptArgs);

    if (launchCommand === undefined) {
      Logger.info('Command arguments :', commandArgs);
      Logger.info();
      exitCode = await launchMenu(config, commandArgs, interactive);
      return;
    }

    const shell = config.options.script.shell;
    const scriptInfo = config.scripts.find(launchCommand);

    if (!scriptInfo) throw new Error('Missing launch script: ' + launchCommand);

    commandArgs[0] = launchCommand.split(' ')[0];

    Logger.info('Command arguments :', commandArgs);
    Logger.info();

    const executor = new Executor(shell, commandArgs, process.env, config.scripts);

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
