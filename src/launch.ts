import { Config, ILaunchSetting, IMenu, ISettings } from './config-loader';
import { Logger } from './logger';
import { Executor } from './executor';
import { launchMenu } from './launch-menu';
import * as fs from 'fs';
import * as path from 'path';
import { formatLocalTime, parseArgs, showArgsHelp, stringify, Colors } from './common';
import { IScripts, Scripts } from './scripts';
import { version } from './package.json';
import prettyTime = require('pretty-time');
import inquirer = require('inquirer');

interface IArgs {
  init: boolean;
  migrate: boolean;
  help: boolean;
  version: boolean;
  logLevel: number;
  config: string;
  script: string;
  ansi: boolean;
  directory: string;
  menuTimeout: number;
}

const npmScripts = [
  'prepublish',
  'prepare',
  'prepublishOnly',
  'prepack',
  'postpack',
  'publish',
  'postpublish',
  'preinstall',
  'install',
  'postinstall',
  'preuninstall',
  'uninstall',
  'postuninstall',
  'preversion',
  'version',
  'postversion',
  'pretest',
  'test',
  'posttest',
  'prestop',
  'stop',
  'poststop',
  'prestart',
  'start',
  'poststart',
  'prerestart',
  'restart',
  'postrestart',
  'preshrinkwrap',
  'shrinkwrap',
  'postshrinkwrap',
];

function showLoadedFiles(files: string[]): void {
  for (const file of files) {
    Logger.info('Loaded config: ', file);
  }
  Logger.info();
}

function showTemplates() {
  const templatePath = path.join(__dirname, 'templates');

  console.log(Colors.Bold + 'Available templates:' + Colors.Normal);
  console.log();

  for (const fileName of fs.readdirSync(templatePath)) {
    console.log(fileName);
  }

}

function copyTemplateFiles(template: string, directory: string): void {
  const templatePath = path.join(__dirname, 'templates', template);

  console.log(Colors.Bold + 'Create starter config:' + Colors.Normal, template);
  console.log();

  if (!fs.existsSync(templatePath) || !fs.statSync(templatePath).isDirectory()) {
    throw new Error('Template not found.');
  }

  for (const fileName of fs.readdirSync(templatePath)) {
    const sourceFile = path.join(templatePath, fileName);
    const targetFile = path.join(directory, fileName);

    if (!fs.existsSync(targetFile)) {
      console.log(Colors.Bold + 'Createing:' + Colors.Normal, targetFile.replace(process.cwd() + path.sep, ''));
      fs.copyFileSync(sourceFile, targetFile);
    } else {
      console.log(Colors.Yellow + Colors.Bold + 'Skipped:' + Colors.Normal, fileName + ' already exists.');
    }
  }
}

async function areYouSure(): Promise<boolean> {
  const choice = await inquirer.prompt<{ value: boolean }>([
    {
      type: 'confirm',
      name: 'value',
      default: false,
      message: 'Are you sure:',
    },
  ]);

  return choice.value;
}

function splitCommand(command: string): string[] {
  const result = [];
  let last = 0;
  let index = 0;

  while (index < command.length) {
    const value = command.substr(index);

    if (value.startsWith('&&')) {
      result.push(command.substr(last, index - last).trim());
      index++;

      last = index + 1;
    }

    if (value.startsWith('(')) {
      let open = 1;

      while (open > 0 && ++index < command.length) {
        if (command[index] === '(') open++;
        if (command[index] === ')') open--;
      }
    }

    if (value.startsWith('\"')) {
      while (++index < command.length && command[index] !== '\"');
    }

    index++;
  }

  result.push(command.substr(last, index - last).trim());

  return result;
}

async function migratePackageJson(directory: string, testmode: boolean): Promise<void> {
  const menuFile = path.join(directory, 'launcher-menu.json');
  const configFile = path.join(directory, 'launcher-config.json');
  const packageFile = path.join(directory, 'package.json');

  console.log(Colors.Bold + 'Migrating: ' + Colors.Normal + 'package.json');
  console.log();

  if (fs.existsSync(menuFile)) {
    console.log(Colors.Red + Colors.Bold + 'Failed:' + Colors.Normal, 'launcher-menu.json already exists.');
    return;
  }

  if (fs.existsSync(configFile)) {
    console.log(Colors.Red + Colors.Bold + 'Failed:' + Colors.Normal, 'launcher-config.json already exists.');
    return;
  }

  const buffer = fs.readFileSync(packageFile);
  const content = JSON.parse(buffer.toString()) as { scripts: { [name: string]: string } };
  const sourceScripts: { [name: string]: string } = {};
  const targetScripts: IScripts = {};
  const menuEntries: IMenu = {
    description: '',
  };

  if (content.scripts && content.scripts.start !== undefined && content.scripts.start !== 'launch') {
    console.log(Colors.Red + Colors.Bold + 'Failed:' + Colors.Normal + ' Remove start script from package.json before running migrate.');
    return;
  }

  for (const [key, value] of Object.entries(content.scripts)) {
    const values = splitCommand(value);
    const entries = key.split(':');
    let currMenu = menuEntries;
    let nextMenu = menuEntries;
    let entry = key;

    for (const item of entries) {
      entry = item;

      currMenu = nextMenu;

      while (typeof currMenu[entry] === 'string') entry += ':menu';

      if (nextMenu[entry] === undefined) {
        nextMenu[entry] = {
          description: '',
        };
      }

      nextMenu = nextMenu[entry] as any;
    }

    if (Object.entries(currMenu[entry]).length > 1) entry += ':command';

    currMenu[entry] = key;

    if (values.length > 1) {
      targetScripts[key] = values.map((item) => item.trim().replace('npm run ', ''));
    } else {
      targetScripts[key] = value;
    }

    if (npmScripts.includes(key)) sourceScripts[key] = 'launch';
  }

  const targetCount = Object.entries(targetScripts).length;
  const sourceCount = Object.entries(sourceScripts).length;

  console.log('Script to remove:', targetCount - sourceCount);
  console.log('Script to update:', sourceCount + 1);
  console.log();

  sourceScripts.start = 'launch';
  content.scripts = sourceScripts;

  if (testmode || await areYouSure()) {
    console.log();
    console.log(Colors.Bold + 'Updating:' + Colors.Normal, packageFile.replace(process.cwd() + path.sep, ''));
    fs.writeFileSync(packageFile, JSON.stringify(content, null, 2));

    console.log(Colors.Bold + 'Creating:' + Colors.Normal, menuFile.replace(process.cwd() + path.sep, ''));
    fs.writeFileSync(menuFile, JSON.stringify({
      menu: menuEntries,
    }, null, 2));

    console.log(Colors.Bold + 'Creating:' + Colors.Normal, configFile.replace(process.cwd() + path.sep, ''));
    fs.writeFileSync(configFile, JSON.stringify({
      scripts: targetScripts,
    }, null, 2));

  }
}

function updatePackageJson(directory: string): void {
  const fileName = path.join(directory, 'package.json');

  console.log(Colors.Bold + 'Updating package.json.' + Colors.Normal);
  console.log();

  if (!fs.existsSync(fileName)) {
    console.log(Colors.Bold + 'Update package.json failed:' + Colors.Normal + ' file not found.');
    return;
  }

  try {

    const buffer = fs.readFileSync(fileName);
    const content = JSON.parse(buffer.toString());

    if (content.scripts && content.scripts.start !== undefined && content.scripts.start !== 'launch') {
      console.log(Colors.Yellow + Colors.Bold + 'Skipped:' + Colors.Normal + ' start script already present.');

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
      '  ' + Colors.Cyan + 'init         ' + Colors.Normal + '[template] Create starter config files.',
    ],

    migrate: '  ' + Colors.Cyan + 'migrate      ' + Colors.Normal + 'Migrate your package.json scripts.',
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
      arguments: {
        logLevel: undefined,
        init: false,
        migrate: false,
        help: false,
        version: false,
        config: null,
        script: null,
        ansi: true,
        directory: process.cwd(),
        menuTimeout: undefined,
      },
      optionals: [],
    });

    launchArgs.arguments.directory = path.join(launchArgs.arguments.directory); // remove starting ./

    const configLoad = Config.load(launchArgs.arguments.directory);
    let config = configLoad.config;
    let interactive = false;

    if (launchArgs.arguments.logLevel === undefined) launchArgs.arguments.logLevel = config.options.logLevel;
    if (launchArgs.arguments.menuTimeout === undefined) launchArgs.arguments.menuTimeout = config.options.menu.timeout;

    Logger.level = launchArgs.arguments.logLevel;

    if (launchArgs.arguments.config) {
      const fileName = path.join(launchArgs.arguments.directory, launchArgs.arguments.config);

      config = config.merge(fileName);

      configLoad.files.push(fileName);
    }

    const shell = Config.evaluateShellOption(config.options.script.shell, true);

    if (!launchArgs.arguments.ansi) disableAnsiColors();

    if (process.platform === 'win32') (Colors as any).Dim = '\x1b[90m';

    const settings = getLaunchSetting(config.settings);
    const environment = {
      ...getEnviromentValues(),
      ...settings.values,
    };

    if (testmode) environment.launch_time_start = formatLocalTime(new Date('2019-09-16T10:33:20.628').getTime());

    showLoadedFiles(configLoad.files);

    Logger.debug('Config: ', stringify(config));

    if (launchArgs.arguments.version) {
      console.log(version);
      Logger.log();
      exitCode = 0;
      return;
    }

    if (launchArgs.arguments.help) {
      showHelp();
      Logger.log();
      exitCode = 0;
      return;
    }

    if (launchArgs.arguments.init) {
      const template = launchArgs.optionals[0];

      if (!template) {
        showTemplates();
        return;
      }

      copyTemplateFiles(template, launchArgs.arguments.directory);

      console.log();

      updatePackageJson(launchArgs.arguments.directory);
      Logger.log();
      exitCode = 0;
      return;
    }
    if (launchArgs.arguments.migrate) {
      await migratePackageJson(launchArgs.arguments.directory, testmode);
      Logger.log();
      exitCode = 0;

      return;
    }

    let launchScript = lifecycleEvent;
    let scriptId = '';

    if (!launchArgs.arguments.script) {
      if (lifecycleEvent === 'start') {
        launchScript = commandArgs[0];
        scriptId = commandArgs.shift();
      }
    } else {
      launchScript = launchArgs.arguments.script;
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

      const result = await launchMenu(environment, settings, config, commandArgs, interactive, launchArgs.arguments.menuTimeout, testmode);

      startTime = result.startTime;
      exitCode = result.exitCode;

      return;
    }

    if (scripts.length === 0) throw new Error('Missing launch script: ' + launchScript);

    const scriptInfo = Scripts.select(scripts);

    if (!launchArgs.arguments.script && lifecycleEvent === 'start') {
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
