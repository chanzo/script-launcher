import { Config, ILaunchSetting, IMenu, ISettings } from './config-loader';
import { Logger } from './logger';
import { Executor } from './executor';
import { launchMenu } from './launch-menu';
import * as fs from 'fs';
import * as path from 'path';
import { extractArgs, extractCommands, formatTime, showArgsHelp, stringify, Colors } from './common';
import { IScript, IScriptTask, Scripts } from './scripts';
import { version } from './package.json';
import prettyTime = require('pretty-time');
import * as os from 'os';
import { migratePackageJson } from './migration';

interface IEnvironmentVariables {
  [key: string]: string;
}

interface IInternalCommands {
  version: boolean;
  help: boolean;
  migrate: boolean;
  init: boolean;
  list: boolean;
}

interface IArgs {
  confirm: boolean;
  logLevel: number;
  dry: boolean;
  config: string;
  ansi: boolean;
  directory: string;
  menuTimeout: number;
  params: number;
  concurrent: boolean;
  limit: number;
  script?: string;
}

function showLoadedFiles(files: string[]): void {
  for (const file of files) {
    Logger.info('Loaded config: ', file);
  }
  Logger.info();
}

function showTemplates(): void {
  const templatePath = path.join(__dirname, 'templates');

  console.log(Colors.Bold + 'Available templates:' + Colors.Normal);
  console.log();

  for (const fileName of fs.readdirSync(templatePath)) {
    console.log(fileName);
  }
  console.log();
  console.log(Colors.Bold + 'Example usage:' + Colors.Normal + ' npm start init basic');
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
      console.log(Colors.Bold + 'Creating:' + Colors.Normal, targetFile.replace(process.cwd() + path.sep, ''));
      fs.copyFileSync(sourceFile, targetFile);
    } else {
      console.log(Colors.Yellow + Colors.Bold + 'Skipped:' + Colors.Normal, fileName + ' already exists.');
    }
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

    if (content.scripts && content.scripts.start !== undefined) {
      if (content.scripts.start === 'launch') {
        console.log(Colors.Yellow + Colors.Bold + 'Skipped:' + Colors.Normal + ' start script is up-to-date.');
      } else {
        console.log(Colors.Yellow + Colors.Bold + 'Skipped:' + Colors.Normal + ' start script already in use.');
      }

      return;
    }
    if (!content.scripts) content.scripts = {};

    content.scripts.start = 'launch';

    fs.writeFileSync(fileName, JSON.stringify(content, null, 2) + '\n');

    console.log(Colors.Bold + 'Start script of package.json updated.' + Colors.Normal);
  } catch (error) {
    console.log(Colors.Bold + 'Update package.json failed: ' + Colors.Normal + error.message);
  }
}

function showHelp(): void {
  showArgsHelp<IInternalCommands & IArgs>('launch', {
    init: ['', 'Commands:', '  ' + Colors.Cyan + 'init         ' + Colors.Normal + '[template] Create starter config files.'],
    list: '  ' + Colors.Cyan + 'list         ' + Colors.Normal + '[type] List available launcher scripts.',
    migrate: '  ' + Colors.Cyan + 'migrate      ' + Colors.Normal + 'Migrate your package.json scripts.',
    help: '  ' + Colors.Cyan + 'help         ' + Colors.Normal + 'Show this help.',
    version: '  ' + Colors.Cyan + 'version      ' + Colors.Normal + 'Outputs launcher version.',
    logLevel: ['', 'Options:', '  ' + Colors.Cyan + 'logLevel=    ' + Colors.Normal + 'Set log level.'],
    dry: '  ' + Colors.Cyan + 'dry=         ' + Colors.Normal + 'Do not execute commands.',
    config: '  ' + Colors.Cyan + 'config=      ' + Colors.Normal + 'Merge in an extra config file.',
    confirm: '  ' + Colors.Cyan + 'confirm=     ' + Colors.Normal + 'Auto value for confirm conditions.',
    ansi: '  ' + Colors.Cyan + 'ansi=        ' + Colors.Normal + 'Enable or disable ansi color output.',
    directory: '  ' + Colors.Cyan + 'directory=   ' + Colors.Normal + 'The directory from which configuration files are loaded.',
    menuTimeout: '  ' + Colors.Cyan + 'menuTimeout= ' + Colors.Normal + 'Set menu timeout in seconds.',
    params: '  ' + Colors.Cyan + 'params=      ' + Colors.Normal + 'Set the number of parameters to preserve.',
    concurrent: '  ' + Colors.Cyan + 'concurrent=  ' + Colors.Normal + 'Execute commandline wildcard matches in parallel.',
    limit: '  ' + Colors.Cyan + 'limit=       ' + Colors.Normal + 'Limit the number of commands to execute in parallel.'
  });
}

function disableAnsiColors(): void {
  for (const key of Object.keys(Colors)) {
    (Colors as any)[key] = '';
  }
}

function getEnvironmentValues(): { [name: string]: string } {
  const environment = { ...process.env };

  for (const [key, value] of Object.entries(Colors)) {
    environment['launch_style_' + key.toLowerCase()] = value;
  }

  environment.launch_time_start = formatTime();
  environment.launch_platform = process.platform;
  environment.launch_version = version;

  delete environment.launch_time_current;
  delete environment.launch_time_elapsed;

  return environment;
}

function getLaunchSetting(settings: ISettings, prefix = 'launch_setting_'): ILaunchSetting {
  const result: ILaunchSetting = {
    values: {},
    arrays: {}
  };

  for (const [key, value] of Object.entries(settings)) {
    if (value instanceof Array) {
      const name = prefix + key;

      result.arrays[name] = [];

      for (const item of value) {
        if (typeof item !== 'object') {
          result.arrays[name].push({
            ['_']: item as string
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

function getMenuScripts(menu: IMenu | string[] | IScriptTask, result: string[] = []): string[] {
  for (const [key, value] of Object.entries(menu)) {
    if (key === 'description') continue;
    if (key === 'separator') continue;
    if (typeof value === 'string') {
      if (value.includes(' ')) continue;
      result.push(value);
    } else {
      getMenuScripts(value, result);
    }
  }

  return result;
}

export async function main(processArgv: string[], processEnvVariables: IEnvironmentVariables, testMode: boolean = false): Promise<void> {
  let exitCode = 1;
  let startTime = process.hrtime();

  try {
    // TODO: This is just a workaround for early access to the working directory
    const workingDirectory = processEnvVariables.npm_config_directory || process.cwd();
    const configLoad = Config.load(workingDirectory);
    let config = configLoad.config;

    // Ignoring "--" in processArgv as everything behind is treated as an argument anyway
    const processArgs: string[] = processArgv.slice(2).filter(statement => statement !== '--');
    // These arguments are mainly written from default -> config -> user input as process argument
    const launchArgs = extractArgs<IArgs>(
      {
        logLevel: config.options.logLevel,
        dry: config.options.dry,
        confirm: undefined,
        config: null,
        script: null,
        ansi: true,
        directory: workingDirectory,
        menuTimeout: config.options.menu.timeout,
        params: Number.MAX_SAFE_INTEGER,
        concurrent: false,
        limit: config.options.limit || os.cpus().length || 1
      },
      processEnvVariables
    );

    launchArgs.directory = path.join(launchArgs.directory); // remove starting ./

    const commands = extractCommands<IInternalCommands>(
      {
        internalCommands: {
          init: false,
          list: false,
          migrate: false,
          help: false,
          version: false
        },
        optionals: [],
        unknowns: []
      },
      processArgs
    );

    let interactive = false;

    if (launchArgs.dry && launchArgs.logLevel < 1) {
      launchArgs.logLevel = 1;
    }

    Logger.level = launchArgs.logLevel;

    if (launchArgs.config) {
      const fileName = path.join(launchArgs.directory, launchArgs.config);

      config = config.merge(fileName);

      configLoad.files.push(fileName);
    }

    const shell = Config.evaluateShellOption(config.options.script.shell, true);

    if (!launchArgs.ansi) disableAnsiColors();

    if (process.platform === 'win32') {
      (Colors as any).Dim = '\x1b[90m';
    }

    const settings = getLaunchSetting(config.settings);
    const environment = {
      ...getEnvironmentValues(),
      ...settings.values
    };

    // Set a specific time so the test execution can evaluate this in the output and won't break
    if (testMode) {
      environment.launch_time_start = formatTime(new Date('2019-09-16T12:33:20.628').getTime(), 0);
    }

    // Just an output which config files were used ...
    showLoadedFiles(configLoad.files);

    let launchScript = processArgs[0] ? [...processArgs[0].split(',')] : [];

    // console.error('Launch Script:');
    // console.error(launchScript);

    // Showing some general process information about script, config, arguments, ...
    showProcessInformation(config, environment, launchScript, shell, launchArgs);

    if (Object.entries(config.scripts.scripts).length === 0) {
      Logger.info();
      Logger.info('Warning: No launcher scripts loaded.');
      Logger.info();
    }

    if (commands.internalCommands.version) {
      console.log(version);
      Logger.log();
      exitCode = 0;
      return;
    }

    if (commands.internalCommands.help) {
      showHelp();
      Logger.log();
      exitCode = 0;
      return;
    }

    if (commands.internalCommands.migrate) {
      await migratePackageJson(launchArgs.directory, launchArgs.params, launchArgs.confirm, testMode);
      Logger.log();
      exitCode = 0;

      return;
    }

    if (commands.internalCommands.init) {
      const template = commands.optionals[0];

      if (!template) {
        showTemplates();
        return;
      }

      copyTemplateFiles(template, launchArgs.directory);

      console.log();

      updatePackageJson(launchArgs.directory);
      Logger.log();
      exitCode = 0;
      return;
    }

    if (commands.internalCommands.list) {
      if (commands.optionals[0] === 'script') {
        const choices: string[] = Object.keys(configLoad.config.scripts.scripts).sort();
        const unique = [...new Set(choices)];

        for (const item of unique) {
          console.log(item);
        }

        return;
      }

      if (commands.optionals[0] === 'menu') {
        const choices = getMenuScripts(configLoad.config.menu).sort();
        const unique = [...new Set(choices)];

        for (const item of unique) {
          console.log(item);
        }

        return;
      }

      if (commands.optionals.length === 0 || commands.optionals[0] === 'complete') {
        const scripts = Object.keys(configLoad.config.scripts.scripts).filter(item => !item.includes('$'));
        const menu = getMenuScripts(configLoad.config.menu).filter(item => !scripts.includes(item));
        const choices: string[] = [...menu, ...scripts].sort();
        const unique = [...new Set(choices)];

        for (const item of unique) {
          console.log(item);
        }

        return;
      }

      console.error('List option not supported: ' + commands.optionals);
      console.error();
      console.error('Use: script, menu or complete');

      throw new Error();
    }

    const scripts = config.scripts.find(...launchScript);
    const defaultScript = config.scripts.find('start');

    if (scripts.length === 0) {
      if (launchScript[0] === 'menu') {
        interactive = true;
        launchScript = [];
        processArgs.shift();
        defaultScript.length = 0;
      }

      if (defaultScript.length > 0) {
        scripts.push(...defaultScript);
        launchScript = ['start'];
      }
    }

    if (launchScript.length === 0) {
      Logger.info();

      const result = await launchMenu(
        environment,
        settings,
        config,
        processArgs,
        interactive,
        launchArgs.menuTimeout,
        config.options.menu.confirm,
        launchArgs.confirm,
        launchArgs.limit,
        launchArgs.dry,
        testMode
      );

      startTime = result.startTime;
      exitCode = result.exitCode;

      return;
    }

    const scriptInfo = Scripts.select(scripts);

    if (!scriptInfo) {
      throw new Error(`Cannot start launch script ${JSON.stringify(launchScript, null, 0)}: No such script available.`);
    }

    if (scriptInfo.multiple && launchArgs.concurrent) {
      scriptInfo.script = {
        concurrent: scriptInfo.script
      } as IScript;
    }

    const script = Scripts.parse(launchScript[0]).command;
    processArgs[0] = script;
    // console.error('launchScript[0]=', processArgs[0]);

    if (!scriptInfo.name) {
      scriptInfo.name = launchScript[0];
    }

    scriptInfo.arguments = processArgs;

    Logger.info();

    const executor = new Executor(shell, environment, settings, config.scripts, config.options.glob, launchArgs.confirm, launchArgs.limit, launchArgs.dry, testMode);

    startTime = executor.startTime;

    exitCode = await executor.execute(scriptInfo);
  } catch (error) {
    let message = `${error}`;

    if (error.message) message = error.message;

    if (message !== 'false' && message !== 'Error') Logger.error(message);
  } finally {
    let timespan = process.hrtime(startTime);

    if (Logger.level < 2) Logger.info('');

    Logger.info('ExitCode:', exitCode);

    if (testMode) timespan = [0, 237 * 1000 * 1000];

    Logger.info('Elapsed: ' + prettyTime(timespan, 'ms'));

    if (!testMode) process.exit(exitCode);
  }
}

function showProcessInformation(config: Config, environment: { [p: string]: string }, launchScript: string[], shell: string | boolean, launchArgs: IArgs): void {
  Logger.debug('Config: ', stringify(config));

  Logger.info(Colors.Bold + 'Date              :', environment.launch_time_start + Colors.Normal);
  Logger.info('Version           :', version);
  Logger.info('Launch script     :', launchScript);
  Logger.debug('Process platform  :', process.platform);
  Logger.debug('Script shell      :', shell);

  if (Logger.level > 2) {
    Logger.info('Launch arguments  :', launchArgs);
  } else {
    // Cannot show a real list of arguments anymore as the arguments started with -- are no longer preserved in the processArgv array
    Logger.info('Launch arguments  :', []);
  }
}
