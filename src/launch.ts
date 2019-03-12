#!./node_modules/.bin/ts-node --skip-project

import { Config } from './config-loader';
import { Logger } from './logger';
import { Command } from './command';
import { launchMenu } from './launch-menu';
import * as fs from 'fs';

async function main(): Promise<void> {
  let exitCode = 1;

  try {
    const config = Config.load();

    Logger.level = config.options.logLevel;

    Logger.debug('Config: ', config);

    const lifecycleEvent = process.env.npm_lifecycle_event;
    const commandArgs: string[] = process.env.npm_config_argv ? JSON.parse(process.env.npm_config_argv).remain : [];
    const scriptArgs = process.argv.slice(2, process.argv.length - commandArgs.length);
    const launchScript = lifecycleEvent === 'start' ? commandArgs[0] : lifecycleEvent;

    Logger.info('Lifecycle event:', lifecycleEvent);
    Logger.info('Command arguments:', commandArgs);
    Logger.info('Script arguments:', scriptArgs);
    Logger.info('Launch script:', launchScript);

    if (`${scriptArgs}` === 'init') {
      const targetFile = 'script-launcher.json';

      if (fs.existsSync(targetFile)) {
        Logger.error('The file "' + targetFile + '" already exists.');
        return;
      }

      fs.writeFileSync(targetFile, JSON.stringify(Config.init, null, 2));

      return;
    }

    if (launchScript === undefined) {
      exitCode = await launchMenu();
      return;
    }

    const shell = config.options.script.shell;
    const command = new Command(shell, commandArgs, process.env, config.scripts);

    exitCode = await command.execute(launchScript);
  } catch (error) {
    Logger.error(`${error}`);
  } finally {
    Logger.info('ExitCode:', exitCode);
    process.exit(exitCode);
  }
}

main();
