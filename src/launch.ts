#!./node_modules/.bin/ts-node --skip-project

import { Config } from './config-loader';
import { Logger } from './logger';
import { Executor } from './executor';
import { launchMenu } from './launch-menu';
import * as fs from 'fs';
import * as path from 'path';
import { stringify } from './common';

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
    const launchScript = lifecycleEvent === 'start' ? commandArgs[0] : lifecycleEvent;

    Logger.info('Lifecycle event:', lifecycleEvent);
    Logger.info('Command arguments:', commandArgs);
    Logger.info('Script arguments:', scriptArgs);
    Logger.info('Launch script:', launchScript);
    Logger.info();

    if (`${scriptArgs}` === 'init') {
      const targetFile = 'launcher-config.json';

      if (fs.existsSync(targetFile)) {
        Logger.error('The file "' + targetFile + '" already exists.');
        return;
      }

      fs.writeFileSync(targetFile, JSON.stringify(Config.init, null, 2));

      return;
    }

    if (launchScript === undefined) {
      exitCode = await launchMenu(config);
      return;
    }

    const shell = config.options.script.shell;
    const executor = new Executor(shell, commandArgs, process.env, config.scripts);
    const script = config.scripts.find(launchScript);

    if (!script) throw new Error('Missing launch script: ' + launchScript);

    exitCode = await executor.execute(script);
  } catch (error) {
    Logger.error(`${error}`);
  } finally {
    Logger.info('ExitCode:', exitCode);
    process.exit(exitCode);
  }
}

main();
