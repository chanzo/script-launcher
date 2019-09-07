#!./node_modules/.bin/ts-node --skip-project

import { Config, IConfig, ILaunchSetting, ISettings } from './config-loader';
import { Logger } from './logger';
import { Executor } from './executor';
import { launchMenu } from './launch-menu';
import * as fs from 'fs';
import * as path from 'path';
import { getCurrentTime, parseArgs, showArgsHelp, stringify, Colors } from './common';
import { Scripts } from './scripts';
import { version } from './package.json';
import prettyTime = require('pretty-time');

interface IArgs {
  init: boolean;
  help: boolean;
  menu: boolean;
  version: boolean;
  interactive: boolean;
  logLevel: number;
  config: string;
  script: string;
  ansi: boolean;
  directory: string;
}

function showLoadedFiles(files: string[]): void {
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
    Logger.error('The file \'' + fileName + '\' already exists.');
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
    script: '  ' + Colors.Cyan + 'script=      ' + Colors.Normal + 'Launcher script to start.',
    ansi: '  ' + Colors.Cyan + 'ansi=        ' + Colors.Normal + 'Enable or disable ansi color output.',
    directory: '  ' + Colors.Cyan + 'directory=   ' + Colors.Normal + 'The directory from which configuration files are loaded.',
  });
}

function disableAnsiColors() {
  for (const key of Object.keys(Colors)) {
    (Colors as any)[key] = '';
  }
}

function getEnviromentValues(): { [name: string]: string } {
  const environment = { ...process.env };

  for (const [key, value] of Object.entries(Colors)) {
    environment['launch_style_' + key.toLowerCase()] = value;
  }

  environment.launch_time_start = getCurrentTime();
  environment.launch_platform = process.platform;
  environment.launch_version = version;

  delete environment.launch_time_current;
  delete environment.launch_time_elapsed;

  return environment;
}

function getLaunchSetting(settings: ISettings, prefix = 'launch_setting_'): ILaunchSetting {
  const result: ILaunchSetting = {
    values: {},
    arrays: {},
  };

  for (const [key, value] of Object.entries(settings)) {
    if (value instanceof Array) {
      const name = prefix + key;

      result.arrays[name] = [];

      for (const item of value) {
        if (typeof item !== 'object') {
          result.arrays[name].push({
            ['_']: item as string,
          });

          continue;
        }

        const settings = getLaunchSetting(item, '_');

        result.arrays[name].push(settings.values);
      }

      continue;
    }

    if (typeof value === 'object') {
      const settings = getLaunchSetting(value, prefix + key + '_');

      result.values = { ...result.values, ...settings.values };
      result.arrays = { ...result.arrays, ...settings.arrays };

      continue;
    }

    result.values[prefix + key.toLowerCase()] = value as string;
  }

  return result;
}

export async function main(processArgv: string[], npmConfigArgv: string, testmode: boolean = false): Promise<void> {
  let exitCode = 1;
  let startTime = process.hrtime();

  try {
    const commandArgs: string[] = npmConfigArgv ? JSON.parse(npmConfigArgv).remain : [];
    const argsString = processArgv.slice(2, processArgv.length - commandArgs.length);
    const launchArgs = parseArgs<IArgs>(argsString, {
      logLevel: undefined,
      init: false,
      help: false,
      menu: false,
      version: false,
      interactive: false,
      config: null,
      script: null,
      ansi: true,
      directory: process.cwd(),
    });

    let config = Config.load(launchArgs.directory);

    if (launchArgs.logLevel === undefined) launchArgs.logLevel = config.options.logLevel;

    Logger.level = launchArgs.logLevel;

    if (launchArgs.config) config = config.merge(launchArgs.config);

    const shell = Config.evaluateShellOption(config.options.script.shell, true);

    if (!launchArgs.ansi) disableAnsiColors();

    if (process.platform === 'win32') (Colors as any).Dim = '\x1b[90m';

    const settings = getLaunchSetting(config.settings);
    const environment = {
      ...getEnviromentValues(),
      ...settings.values,
    };

    showLoadedFiles([...config.options.files, launchArgs.config]);

    Logger.debug('Config: ', stringify(config));

    if (launchArgs.version) {
      console.log(version);
      Logger.log();
      exitCode = 0;
      return;
    }

    if (launchArgs.help) {
      showHelp();
      Logger.log();
      exitCode = 0;
      return;
    }

    if (launchArgs.init) {
      createExampleFile('launcher-config.json', Config.initConfig);
      createExampleFile('launcher-settings.json', Config.settingsConfig);
      createExampleFile('launcher-menu.json', Config.initMenu);
      Logger.log();
      exitCode = 0;
      return;
    }

    const lifecycleEvent = environment.npm_lifecycle_event;
    const launchScript = launchArgs.script ? launchArgs.script : lifecycleEvent === 'start' ? commandArgs[0] : lifecycleEvent;

    Logger.info(Colors.Bold + 'Date              :', environment.launch_time_start + Colors.Normal);
    Logger.info('Version           :', version);
    Logger.info('Lifecycle event   :', lifecycleEvent);
    Logger.info('Launch script     :', launchScript);
    Logger.debug('Process platform  :', process.platform);
    Logger.debug('Script shell      :', shell);

    if (Logger.level > 2) {
      Logger.info('Launch arguments  :', launchArgs);
    } else {
      Logger.info('Launch arguments  :', argsString);
    }

    if (Object.entries(config.scripts.scripts).length === 0) {
      Logger.info();
      Logger.info('Warning: No launcher scripts loaded.');
      Logger.info();
    }

    if (launchScript === undefined || launchArgs.menu) {
      Logger.info('Command arguments :', commandArgs);
      Logger.info();

      const result = await launchMenu(environment, settings, config, commandArgs, launchArgs.interactive, testmode);

      startTime = result.startTime;
      exitCode = result.exitCode;

      return;
    }

    const scripts = config.scripts.find(launchScript);

    if (scripts.length === 0) throw new Error('Missing launch script: ' + launchScript);

    const scriptInfo = Scripts.select(scripts);

    commandArgs[0] = Scripts.parse(launchScript).command;

    scriptInfo.arguments = commandArgs;

    Logger.info('Command arguments :', commandArgs);
    Logger.info();

    const executor = new Executor(shell, environment, settings, config.scripts, config.options.glob, testmode);

    startTime = executor.startTime;

    exitCode = await executor.execute(scriptInfo);
  } catch (error) {
    Logger.error(`${error}`);
  } finally {
    const timespan = process.hrtime(startTime);

    if (Logger.level < 2) Logger.info('');

    Logger.info('ExitCode:', exitCode);
    Logger.info('Elapsed: ' + prettyTime(timespan, 'ms'));

    if (!testmode) process.exit(exitCode);
  }
}
