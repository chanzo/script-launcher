#!./node_modules/.bin/ts-node --skip-project

import { Config, IConfig } from './config-loader';
import { Logger } from './logger';
import { Executor } from './executor';
import { launchMenu } from './launch-menu';
import * as fs from 'fs';
import * as path from 'path';
import { getCurrentTime, parseArgs, showArgsHelp, stringify, Colors } from './common';
import { Scripts } from './scripts';
import { version } from './package.json';

interface IArgs {
  init: boolean;
  help: boolean;
  menu: boolean;
  version: boolean;
  interactive: boolean;
  logLevel: number;
  config: string;
  ansi: boolean;
}

function showLoadedFiles(files: string[], logger: Logger) {
  for (const file of files) {
    if (file) {
      const absolutePath = path.resolve(file);

      if (fs.existsSync(absolutePath)) {
        logger.info('Loaded config: ', absolutePath);
      }
    }
  }
  logger.info();
}

function createExampleFile(fileName: string, config: Partial<IConfig>): void {
  if (fs.existsSync(fileName)) {
    console.error('The file "' + fileName + '" already exists.');
    return;
  }

  fs.writeFileSync(fileName, JSON.stringify(config, null, 2));

  console.log('Created file: ' + fileName);
}

function showHelp() {
  showArgsHelp<IArgs>('launch', {
    init: [
      '',
      'Commands:',
      '  ' + Colors.Cyan + 'init         ' + Colors.Normal + 'Create starter config files.',
    ],
    help: '  ' + Colors.Cyan + 'help         ' + Colors.Normal + 'Show this help.',
    menu: '  ' + Colors.Cyan + 'menu         ' + Colors.Normal + 'Show interactive menu.',
    version: '  ' + Colors.Cyan + 'version      ' + Colors.Normal + 'Outputs launcher version.',
    interactive: [
      '',
      'Options:',
      '  ' + Colors.Cyan + 'interactive  ' + Colors.Normal + 'Force to show menu the by ignoring the options value of defaultScript.',
    ],
    logLevel: '  ' + Colors.Cyan + 'logLevel=    ' + Colors.Normal + 'Set log level.',
    config: '  ' + Colors.Cyan + 'config=      ' + Colors.Normal + 'Merge in an extra config file.',
    ansi: '  ' + Colors.Cyan + 'ansi=        ' + Colors.Normal + 'Enable or disable ansi color output.',
  });
}

function disableAnsiColors() {
  for (const key of Object.keys(Colors)) {
    (Colors as any)[key] = '';
  }
}

function setLauncherEnviromentValues() {
  for (const [key, value] of Object.entries(Colors)) {
    process.env['LAUNCH_' + key.toUpperCase()] = value;
  }
  process.env.LAUNCH_START = getCurrentTime();
}

async function main(): Promise<void> {
  let exitCode = 1;
  let startTime = Date.now();
  let logger = new Logger(3);

  try {
    let config = Config.load();
    const commandArgs: string[] = process.env.npm_config_argv ? JSON.parse(process.env.npm_config_argv).remain : [];
    const argsString = process.argv.slice(2, process.argv.length - commandArgs.length);
    const launchArgs = parseArgs<IArgs>(argsString, {
      logLevel: config.options.logLevel,
      init: false,
      help: false,
      menu: false,
      version: false,
      interactive: false,
      config: null,
      ansi: true,
    });

    logger = new Logger(launchArgs.logLevel);

    if (launchArgs.config) config = config.merge(launchArgs.config);

    const shell = Config.evaluateShellOption(config.options.script.shell, true);

    if (!launchArgs.ansi) disableAnsiColors();

    setLauncherEnviromentValues();

    showLoadedFiles([...config.options.files, launchArgs.config], logger);

    logger.debug('Config: ', stringify(config));

    if (launchArgs.version) {
      console.log(version);
      logger.log();
      exitCode = 0;
      return;
    }

    if (launchArgs.help) {
      showHelp();
      logger.log();
      exitCode = 0;
      return;
    }

    if (launchArgs.init) {
      createExampleFile('launcher-config.json', Config.initConfig);
      createExampleFile('launcher-menu.json', Config.initMenu);
      logger.log();
      exitCode = 0;
      return;
    }

    const lifecycleEvent = process.env.npm_lifecycle_event;
    const launchCommand = lifecycleEvent === 'start' ? commandArgs[0] : lifecycleEvent;

    logger.info(Colors.Bold + 'Date              :', process.env.LAUNCH_START + Colors.Normal);
    logger.info('Version           :', version);
    logger.info('Lifecycle event   :', lifecycleEvent);
    logger.info('Launch command    :', launchCommand);
    logger.debug('Process platform  :', process.platform);
    logger.debug('Script shell      :', shell);

    if (logger.level > 2) {
      logger.info('Launch arguments  :', launchArgs);
    } else {
      logger.info('Launch arguments  :', argsString);
    }

    if (launchCommand === undefined || launchArgs.menu) {
      logger.info('Command arguments :', commandArgs);
      logger.info();

      const result = await launchMenu(config, commandArgs, launchArgs.interactive);

      startTime = result.startTime;
      exitCode = result.exitCode;

      return;
    }

    const scripts = config.scripts.find(launchCommand);

    if (scripts.length === 0) throw new Error('Missing launch script: ' + launchCommand);

    const scriptInfo = Scripts.select(scripts);

    commandArgs[0] = Scripts.parse(launchCommand).command;

    scriptInfo.arguments = commandArgs;

    logger.info('Command arguments :', commandArgs);
    logger.info();

    const executor = new Executor(shell, process.env, config.scripts, logger.level);

    exitCode = await executor.execute(scriptInfo);
  } catch (error) {
    logger.error(`${error}`);
  } finally {
    const timespan = Date.now() - startTime;

    if (logger.level < 2) logger.info('');

    logger.info('Timespan:', timespan + ' ms');
    logger.info('ExitCode:', exitCode);

    process.exit(exitCode);
  }
}

main();
