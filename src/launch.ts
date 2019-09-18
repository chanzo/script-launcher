import { Config, IConfig, ILaunchSetting, ISettings } from './config-loader';
import { Logger } from './logger';
import { Executor } from './executor';
import { launchMenu } from './launch-menu';
import * as fs from 'fs';
import * as path from 'path';
import { formatLocalTime, parseArgs, showArgsHelp, stringify, Colors } from './common';
import { Scripts } from './scripts';
import { version } from './package.json';
import prettyTime = require('pretty-time');

interface IArgs {
  init: boolean;
  help: boolean;
  version: boolean;
  logLevel: number;
  config: string;
  script: string;
  ansi: boolean;
  directory: string;
  template: string;
  menuTimeout: number;
}

function showLoadedFiles(files: string[]): void {
  for (const file of files) {
    Logger.info('Loaded config: ', file);
  }
  Logger.info();
}

function copyTemplateFiles(template: string, directory: string): void {
  const templatePath = path.join(__dirname, 'templates', template);

  console.log(Colors.Bold + 'Create starter config with template:' + Colors.Normal, template);
  console.log();

  if (!fs.existsSync(templatePath) || !fs.statSync(templatePath).isDirectory()) {
    throw new Error('Template not found.');
  }

  for (const fileName of fs.readdirSync(templatePath)) {
    const sourceFile = path.join(templatePath, fileName);
    const targetFile = path.join(directory, fileName);

    if (!fs.existsSync(targetFile)) {
      console.log(Colors.Bold + 'Createing:' + Colors.Normal, targetFile);
      fs.copyFileSync(sourceFile, targetFile);
    } else {
      console.log(Colors.Bold + 'Skipped:' + Colors.Normal, fileName + ', already exists.');
    }
  }
}

function updatePackageJson(directory: string): void {
  const fileName = path.join(directory, 'package.json');

  console.log();

  if (!fs.existsSync(fileName)) {
    console.log(Colors.Bold + 'Update package.json failed:' + Colors.Normal + ' file not found.');
    return;
  }

  try {

    const buffer = fs.readFileSync(fileName);
    const content = JSON.parse(buffer.toString());

    if (content.scripts && content.scripts.start !== undefined) {
      console.log(Colors.Bold + 'Skipped update package.json: ' + Colors.Normal + 'start script already present.');

      return;
    }
    if (!content.scripts) content.scripts = {};

    content.scripts.start = 'launch';

    fs.writeFileSync(fileName, JSON.stringify(content, null, 2));

    console.log(Colors.Bold + 'Start script of package.json updated.' + Colors.Normal);
  } catch (error) {
    console.log(Colors.Bold + 'Update package.json failed: ' + Colors.Normal + error.message);
  }
}

function showHelp() {
  showArgsHelp<IArgs>('launch', {
    init: [
      '',
      'Commands:',
      '  ' + Colors.Cyan + 'init         ' + Colors.Normal + 'Create starter config files.',
    ],
    help: '  ' + Colors.Cyan + 'help         ' + Colors.Normal + 'Show this help.',
    version: '  ' + Colors.Cyan + 'version      ' + Colors.Normal + 'Outputs launcher version.',
    logLevel: [
      '',
      'Options:', '  ' + Colors.Cyan + 'logLevel=    ' + Colors.Normal + 'Set log level.',
    ],
    config: '  ' + Colors.Cyan + 'config=      ' + Colors.Normal + 'Merge in an extra config file.',
    script: '  ' + Colors.Cyan + 'script=      ' + Colors.Normal + 'Launcher script to start.',
    ansi: '  ' + Colors.Cyan + 'ansi=        ' + Colors.Normal + 'Enable or disable ansi color output.',
    directory: '  ' + Colors.Cyan + 'directory=   ' + Colors.Normal + 'The directory from which configuration files are loaded.',
    template: '  ' + Colors.Cyan + 'template=    ' + Colors.Normal + 'The template to use for the starter config files.',
    menuTimeout: '  ' + Colors.Cyan + 'menuTimeout= ' + Colors.Normal + 'Set menu timeout in seconds.',
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

  environment.launch_time_start = formatLocalTime();
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
function getRemaining(args: string[]): string[] {
  const index = args.indexOf('--');

  if (index === -1) return [];

  return args.slice(index + 1);
}

export async function main(lifecycleEvent: string, processArgv: string[], npmConfigArgv: string, testmode: boolean = false): Promise<void> {
  let exitCode = 1;
  let startTime = process.hrtime();

  // console.log('processArgv:', processArgv);
  // console.log('npmConfigArgv:', npmConfigArgv);

  try {
    const commandArgs: string[] = npmConfigArgv ? JSON.parse(npmConfigArgv).remain : [];
    const argsString = processArgv.slice(2, processArgv.length - commandArgs.length);
    const launchArgs = parseArgs<IArgs>(argsString, {
      logLevel: undefined,
      init: false,
      help: false,
      version: false,
      config: null,
      script: null,
      ansi: true,
      directory: process.cwd(),
      template: 'basic',
      menuTimeout: undefined,
    });

    launchArgs.directory = path.join(launchArgs.directory); // remove starting ./

    const configLoad = Config.load(launchArgs.directory);
    let config = configLoad.config;
    let interactive = false;

    if (launchArgs.logLevel === undefined) launchArgs.logLevel = config.options.logLevel;
    if (launchArgs.menuTimeout === undefined) launchArgs.menuTimeout = config.options.menu.timeout;

    Logger.level = launchArgs.logLevel;

    if (launchArgs.config) {
      const fileName = path.join(launchArgs.directory, launchArgs.config);

      config = config.merge(fileName);

      configLoad.files.push(fileName);
    }

    const shell = Config.evaluateShellOption(config.options.script.shell, true);

    if (!launchArgs.ansi) disableAnsiColors();

    if (process.platform === 'win32') (Colors as any).Dim = '\x1b[90m';

    const settings = getLaunchSetting(config.settings);
    const environment = {
      ...getEnviromentValues(),
      ...settings.values,
    };

    if (testmode) environment.launch_time_start = formatLocalTime(new Date('2019-09-16T10:33:20.628').getTime());

    showLoadedFiles(configLoad.files);

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
      copyTemplateFiles(launchArgs.template, launchArgs.directory);

      updatePackageJson(launchArgs.directory);
      Logger.log();
      exitCode = 0;
      return;
    }

    let launchScript = lifecycleEvent;
    let scriptId = '';

    if (!launchArgs.script) {
      if (lifecycleEvent === 'start') {
        launchScript = commandArgs[0];
        scriptId = commandArgs.shift();
      }
    } else {
      launchScript = launchArgs.script;
    }

    commandArgs.unshift(...getRemaining(argsString));

    if (scriptId) commandArgs.unshift(scriptId);

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

    const scripts = config.scripts.find(launchScript);

    if (launchScript === 'menu' && scripts.length === 0) {
      interactive = true;
      launchScript = undefined;
    }

    if (launchScript === undefined) {
      Logger.info();

      const result = await launchMenu(environment, settings, config, commandArgs, interactive, launchArgs.menuTimeout, testmode);

      startTime = result.startTime;
      exitCode = result.exitCode;

      return;
    }

    if (scripts.length === 0) throw new Error('Missing launch script: ' + launchScript);

    const scriptInfo = Scripts.select(scripts);

    if (!launchArgs.script && lifecycleEvent === 'start') {
      commandArgs[0] = Scripts.parse(launchScript).command;
    } else {
      commandArgs.unshift(Scripts.parse(launchScript).command);
    }

    scriptInfo.arguments = commandArgs;

    Logger.info();

    const executor = new Executor(shell, environment, settings, config.scripts, config.options.glob, testmode);

    startTime = executor.startTime;

    exitCode = await executor.execute(scriptInfo);
  } catch (error) {
    Logger.error(`${error}`);
  } finally {
    let timespan = process.hrtime(startTime);

    if (Logger.level < 2) Logger.info('');

    Logger.info('ExitCode:', exitCode);

    if (testmode) timespan = [0, 237 * 1000 * 1000];

    Logger.info('Elapsed: ' + prettyTime(timespan, 'ms'));

    if (!testmode) process.exit(exitCode);
  }
}
