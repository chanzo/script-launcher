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

    Logger.level = config.configurations.logLevel;

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

    const shell = config.configurations.script.shell;
    const command = new Command(commandArgs, process.env, config.scripts);
    const script = config.scripts.find(launchScript);

    if (!script) throw new Error('Missing launch script: ' + launchScript);

    Logger.info('Selected script:', script.name);
    Logger.info('Parameters:', script.parameters);

    const commands = command.prepare(script);

    Logger.log('Prepared commands: ', JSON.stringify(commands, null, 2));

    exitCode = await command.execute(commands, shell);
    // exitCode = 0;

    Logger.info('ExitCode:', exitCode);
  } catch (error) {
    Logger.error(`${error}`);
  } finally {
    process.exit(exitCode);
  }
}

main();
