import { Config, ILaunchSetting, IMenu, ISettings } from './config-loader';
import { Logger } from './logger';
import { Executor } from './executor';
import { launchMenu } from './launch-menu';
import * as fs from 'fs';
import * as path from 'path';
import { confirmPrompt, formatTime, parseArgs, showArgsHelp, stringify, Colors } from './common';
import { IScript, IScripts, IScriptTask, Scripts } from './scripts';
import { version } from './package.json';
import prettyTime = require('pretty-time');

interface IArgs {
  init: boolean;
  list: boolean;
  migrate: boolean;
  confirm: boolean;
  help: boolean;
  version: boolean;
  logLevel: number;
  config: string;
  ansi: boolean;
  directory: string;
  menuTimeout: number;
  params: number;
  concurrent: boolean;
  script?: string;
}

interface IScriptDefinition {
  params: string[][];
  keys: string[];
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
  console.log();
  console.log(Colors.Bold + 'Example usage:' + Colors.Normal + ' npx launch init basic');

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

function splitCommand(command: string): string[] {
  const result = [];
  let last = 0;
  let index = 0;

  while (index < command.length) {
    const value = command.substr(index);
    const semicolon = value.startsWith(';');

    if (value.startsWith('&&') || semicolon) {
      result.push(command.substr(last, index - last).trim() + (semicolon ? ' || true' : ''));
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

    if (value.startsWith('\'')) {
      while (++index < command.length && command[index] !== '\'');
    }

    index++;
  }

  result.push(command.substr(last, index - last).trim());

  return result;
}

function checkMigratePrerequisites(directory: string, scripts: { [name: string]: string }): boolean {
  const menuFile = path.join(directory, 'launcher-menu.json');
  const configFile = path.join(directory, 'launcher-config.json');

  if (fs.existsSync(menuFile)) {
    console.log(Colors.Red + Colors.Bold + 'Failed:' + Colors.Normal, 'launcher-menu.json already exists.');
    return false;
  }

  if (fs.existsSync(configFile)) {
    console.log(Colors.Red + Colors.Bold + 'Failed:' + Colors.Normal, 'launcher-config.json already exists.');
    return false;
  }

  if (scripts && scripts.start !== undefined && scripts.start !== 'launch') {
    console.log(Colors.Red + Colors.Bold + 'Failed:' + Colors.Normal + ' Remove start script from package.json before running migrate.');
    return false;
  }

  return true;
}

function migrateMenu(scripts: { [name: string]: string }): IMenu {
  const menuEntries: IMenu = {
    description: '',
  };

  for (const [key] of Object.entries(scripts)) {
    const entries = key.split(':');
    let currMenu = menuEntries;
    let nextMenu = menuEntries;
    let entry = key;

    for (const item of entries) {
      entry = item;

      currMenu = nextMenu;

      if (currMenu === menuEntries) entry += ':...';

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
  }

  return menuEntries;
}

function migrateScripts(scripts: { [name: string]: string }): { source: { [name: string]: string }, target: IScripts } {
  const sourceScripts: { [name: string]: string } = {};
  const targetScripts: IScripts = {};

  for (const [key, value] of Object.entries(scripts).sort(([key1], [key2]) => key1.localeCompare(key2))) {
    let values = splitCommand(value);

    if (values.length > 1) {
      values = values.map((item) => {
        if (item.startsWith('npm run ')) {
          item = item.trim().replace('npm run ', '');
          item = item.trim().replace(' || true', '');
          item = item.trim();
        }
        return item;
      });
      values = values.map((item) => {
        if (item.startsWith('cd ')) {
          item = item.trim().replace('cd ', '');
          item = item.trim().replace(' || true', '');
          item = item.trim();
        }
        return item;
      });

      targetScripts[key] = values;
    } else {
      targetScripts[key] = value;
    }

    if (npmScripts.includes(key)) sourceScripts[key] = 'launch';
  }

  return {
    source: sourceScripts,
    target: targetScripts,
  };
}

function objectFromEntries<T>(entries: Array<[string, T]>): { [name: string]: T } {
  const object: { [name: string]: T } = {};

  for (const [name, value] of entries) {
    object[name] = value;
  }

  return object;
}

function parameterize(key: string, value: string, preserveParams: number): { key: string, value: string, params: string[] } {
  const params = key.split(':');
  let index = 0;

  for (const param of params) {
    if (index >= preserveParams) {
      const expression = new RegExp(param, 'g');

      if (value.includes(param)) {
        key = key.replace(expression, '$param' + index);
        value = value.replace(expression, '$param' + index);
      }
    }

    index++;
  }

  return { key, value, params };
}

function getScriptDefinitions(scripts: { [name: string]: string }, preserveParams: number): { [name: string]: IScriptDefinition } {
  const definitions: { [name: string]: IScriptDefinition } = {};

  for (const [key, value] of Object.entries(scripts)) {
    const parameters = parameterize(key, value, preserveParams);
    let definition = definitions[parameters.value];

    if (definition === undefined) {
      definition = {
        keys: [],
        params: [],
      };
      definitions[parameters.value] = definition;
    }

    if (!definition.keys.includes(parameters.key)) definition.keys.push(parameters.key);

    definition.params.push(parameters.params);
  }

  const sorted = Object.entries(definitions).sort(([, definition1], [, definition2]) => definition2.params.length - definition1.params.length);

  return objectFromEntries(sorted);
}

function expandParams(name: string, command: string, params: string[][]): Array<{ name: string, command: string }> {
  let match: { index: number, value: string[] } = null;
  const length = (params.find(() => true) || { length: 0 }).length;
  const keys = name.split(':');

  for (let index = 0; index < length; index++) {
    if (keys[index].startsWith('$')) {
      const value = [...new Set(params.map((item) => item[index]))];

      if (match === null || value.length <= match.value.length) {
        match = {
          index: index,
          value: value,
        };
      }
    }
  }

  if (match === null) return [];

  const expression = new RegExp('\\$param' + match.index, 'g');
  const result: Array<{ name: string, command: string }> = [];

  for (const item of match.value) {
    result.push({
      name: name.replace(expression, item),
      command: command.replace(expression, item),
    });
  }

  return result;
}

function resolveConflicts(scripts: { [name: string]: string }, name: string, command: string, params: string[][]): Array<{ name: string, command: string }> {
  if (scripts[name] === undefined) return [{ name, command }];

  const expanded = expandParams(name, command, params);
  const result: Array<{ name: string, command: string }> = [];

  for (const item of expanded) {
    result.push(...resolveConflicts(scripts, item.name, item.command, params));
  }

  return result;
}

function combineScripts(scripts: { [name: string]: string }, preserveParams: number): { [name: string]: string } {
  const definitions = getScriptDefinitions(scripts, preserveParams);
  const combineScripts: { [name: string]: string } = {};

  for (const [script, definition] of Object.entries(definitions)) {
    for (const key of definition.keys) {
      const scripts: Array<{ name: string, command: string }> = [];

      scripts.push(...resolveConflicts(combineScripts, key, script, definition.params));

      for (const script of scripts) {
        combineScripts[script.name] = script.command;
      }
    }
  }

  return combineScripts;
}

async function migratePackageJson(directory: string, preserveParams: number, confirm: boolean, testmode: boolean): Promise<void> {
  const menuFile = path.join(directory, 'launcher-menu.json');
  const configFile = path.join(directory, 'launcher-config.json');
  const packageFile = path.join(directory, 'package.json');

  console.log(Colors.Bold + 'Migrating: ' + Colors.Normal + 'package.json');
  console.log();

  const content = JSON.parse(fs.readFileSync(packageFile).toString()) as { scripts: { [name: string]: string } };

  if (!checkMigratePrerequisites(directory, content.scripts)) return;

  const menuEntries = migrateMenu(content.scripts);
  const combinedScripts = combineScripts(content.scripts, preserveParams);
  const scripts = migrateScripts(combinedScripts);

  const targetCount = Object.entries(scripts.target).length;
  const sourceCount = Object.entries(scripts.source).length;

  console.log('Script to migrate:', targetCount - sourceCount);
  console.log('Script to update:', sourceCount + 1);
  console.log();

  scripts.source.start = 'launch';
  content.scripts = scripts.source;

  Logger.log('package.json:', content);
  Logger.log();
  Logger.log('launcher-menu.json:', {
    menu: menuEntries,
  });
  Logger.log();
  Logger.log('launcher-config.json:', {
    scripts: scripts.target,
  });
  Logger.log();

  let autoValue: boolean;

  if (confirm !== undefined) autoValue = confirm;
  if (testmode) autoValue = true;

  if (await confirmPrompt('Are you sure', autoValue)) {
    console.log();
    console.log(Colors.Bold + 'Updating:' + Colors.Normal, packageFile.replace(process.cwd() + path.sep, ''));
    fs.writeFileSync(packageFile, JSON.stringify(content, null, 2));

    console.log(Colors.Bold + 'Creating:' + Colors.Normal, menuFile.replace(process.cwd() + path.sep, ''));
    fs.writeFileSync(menuFile, JSON.stringify({
      menu: menuEntries,
    }, null, 2));

    console.log(Colors.Bold + 'Creating:' + Colors.Normal, configFile.replace(process.cwd() + path.sep, ''));
    fs.writeFileSync(configFile, JSON.stringify({
      scripts: scripts.target,
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
    list: '  ' + Colors.Cyan + 'list         ' + Colors.Normal + '[type] List available launcher scripts.',
    migrate: '  ' + Colors.Cyan + 'migrate      ' + Colors.Normal + 'Migrate your package.json scripts.',
    help: '  ' + Colors.Cyan + 'help         ' + Colors.Normal + 'Show this help.',
    version: '  ' + Colors.Cyan + 'version      ' + Colors.Normal + 'Outputs launcher version.',
    logLevel: [
      '',
      'Options:', '  ' + Colors.Cyan + 'logLevel=    ' + Colors.Normal + 'Set log level.',
    ],
    config: '  ' + Colors.Cyan + 'config=      ' + Colors.Normal + 'Merge in an extra config file.',
    confirm: '  ' + Colors.Cyan + 'confirm=     ' + Colors.Normal + 'Auto value for confirm conditions.',
    ansi: '  ' + Colors.Cyan + 'ansi=        ' + Colors.Normal + 'Enable or disable ansi color output.',
    directory: '  ' + Colors.Cyan + 'directory=   ' + Colors.Normal + 'The directory from which configuration files are loaded.',
    menuTimeout: '  ' + Colors.Cyan + 'menuTimeout= ' + Colors.Normal + 'Set menu timeout in seconds.',
    params: '  ' + Colors.Cyan + 'params=      ' + Colors.Normal + 'Set the number of parameters to preserve.',
    concurrent: '  ' + Colors.Cyan + 'concurrent=  ' + Colors.Normal + 'Execute commandline wildcard matches in parallel.',
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

export async function main(lifecycleEvent: string, processArgv: string[], npmConfigArgv: string, testmode: boolean = false): Promise<void> {
  let exitCode = 1;
  let startTime = process.hrtime();

  try {
    const commandArgs: string[] = npmConfigArgv ? JSON.parse(npmConfigArgv).remain : [];
    const argsString = processArgv.slice(2, processArgv.length - commandArgs.length);
    const launchArgs = parseArgs<IArgs>(argsString, {
      arguments: {
        logLevel: undefined,
        init: false,
        list: false,
        migrate: false,
        confirm: undefined,
        help: false,
        version: false,
        config: null,
        script: null,
        ansi: true,
        directory: process.cwd(),
        menuTimeout: undefined,
        params: undefined,
        concurrent: false,
      },
      optionals: [],
      unknowns: [],
    });

    launchArgs.arguments.directory = path.join(launchArgs.arguments.directory); // remove starting ./

    const configLoad = Config.load(launchArgs.arguments.directory);
    let config = configLoad.config;
    let interactive = false;

    if (launchArgs.arguments.logLevel === undefined) launchArgs.arguments.logLevel = config.options.logLevel;
    if (launchArgs.arguments.menuTimeout === undefined) launchArgs.arguments.menuTimeout = config.options.menu.timeout;
    if (argsString.includes('--params') && launchArgs.arguments.params === undefined) launchArgs.arguments.params = 1;
    if (launchArgs.arguments.params === undefined) launchArgs.arguments.params = Number.MAX_SAFE_INTEGER;

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

    if (testmode) environment.launch_time_start = formatTime(new Date('2019-09-16T12:33:20.628').getTime(), 0);

    showLoadedFiles(configLoad.files);

    let launchScript = lifecycleEvent ? [lifecycleEvent] : [];
    let scriptId = '';

    if (launchArgs.unknowns.length === 0) {
      if (lifecycleEvent === 'start') {
        launchScript = commandArgs[0] ? [commandArgs[0]] : [];
        scriptId = commandArgs.shift();
      }
    } else {
      launchScript = launchArgs.unknowns;
    }

    Logger.debug('Config: ', stringify(config));

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

    if (launchArgs.arguments.list) {
      if (launchArgs.optionals.length === 0 || launchArgs.optionals[0] === 'script') {
        for (const item of Object.keys(configLoad.config.scripts.scripts)) {
          console.log(item);
        }

        return;
      }

      if (launchArgs.optionals[0] === 'menu') {
        for (const item of getMenuScripts(configLoad.config.menu)) {
          console.log(item);
        }

        return;
      }

      if (launchArgs.optionals[0] === 'completion') {
        const scripts = Object.keys(configLoad.config.scripts.scripts).filter((item) => !item.includes('$'));
        const menu = getMenuScripts(configLoad.config.menu).filter((item) => !scripts.includes(item));
        const choices: string[] = [...menu, ...scripts].sort();

        for (const item of choices) {
          console.log(item);
        }

        return;
      }

      console.error('List option not supported: ' + launchArgs.optionals);
      console.error();
      console.error('Use: script, menu or completion');

      throw new Error();
    }

    if (launchArgs.arguments.migrate) {
      await migratePackageJson(launchArgs.arguments.directory, launchArgs.arguments.params, launchArgs.arguments.confirm, testmode);
      Logger.log();
      exitCode = 0;

      return;
    }

    commandArgs.unshift(...getRemaining(argsString));

    if (scriptId) commandArgs.unshift(scriptId);

    const scripts = config.scripts.find(...launchScript);

    if (launchScript[0] === 'menu' && scripts.length === 0) {
      interactive = true;
      launchScript = [];
    }

    if (launchScript.length === 0) {
      Logger.info();

      const result = await launchMenu(environment, settings, config, commandArgs, interactive, launchArgs.arguments.menuTimeout, launchArgs.arguments.confirm, testmode);

      startTime = result.startTime;
      exitCode = result.exitCode;

      return;
    }

    const scriptInfo = Scripts.select(scripts);

    if (!scriptInfo) throw new Error('Cannot start launch script ' + JSON.stringify(launchScript, null, 0) + ': No such script available.');

    if (scriptInfo.multiple && launchArgs.arguments.concurrent) {
      scriptInfo.script = {
        concurrent: scriptInfo.script,
      } as IScript;
    }

    if (launchArgs.unknowns.length === 0 && lifecycleEvent === 'start') {
      commandArgs[0] = Scripts.parse(launchScript[0]).command;
    } else {
      commandArgs.unshift(Scripts.parse(launchScript[0]).command);
    }

    if (!scriptInfo.name) scriptInfo.name = launchScript[0];

    scriptInfo.arguments = commandArgs;

    Logger.info();

    const executor = new Executor(shell, environment, settings, config.scripts, config.options.glob, launchArgs.arguments.confirm, testmode);

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

    if (testmode) timespan = [0, 237 * 1000 * 1000];

    Logger.info('Elapsed: ' + prettyTime(timespan, 'ms'));

    if (!testmode) process.exit(exitCode);
  }
}
