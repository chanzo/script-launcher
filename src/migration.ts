import * as path from 'path';
import { confirmPrompt, Colors } from './common';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { Logger } from './logger';
import { IMenu } from './config-loader';
import { IScripts } from './scripts';

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
  'postshrinkwrap'
];

interface IScriptDefinition {
  params: string[][];
  keys: string[];
}

function checkCleanGit(): boolean {
  try {
    const result = execSync('git status --porcelain', { encoding: 'utf8', stdio: 'pipe' });

    return result.trim().length === 0;
  } catch {}

  return true;
}

function combineScripts(scripts: { [name: string]: string }, preserveParams: number): { [name: string]: string } {
  const definitions = getScriptDefinitions(scripts, preserveParams);
  const combineScripts: { [name: string]: string } = {};

  for (const [script, definition] of Object.entries(definitions)) {
    for (const key of definition.keys) {
      const scripts: Array<{ name: string; command: string }> = [];

      scripts.push(...resolveConflicts(combineScripts, key, script, definition.params));

      for (const script of scripts) {
        combineScripts[script.name] = script.command;
      }
    }
  }

  return combineScripts;
}

function migrateMenu(scripts: { [name: string]: string }): IMenu {
  const menuEntries: IMenu = {
    description: ''
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
          description: ''
        };
      }

      nextMenu = nextMenu[entry] as any;
    }

    if (Object.entries(currMenu[entry]).length > 1) entry += ':command';

    currMenu[entry] = key;
  }

  return menuEntries;
}

function migrateScripts(scripts: { [name: string]: string }): { source: { [name: string]: string }; target: IScripts } {
  const sourceScripts: { [name: string]: string } = {};
  const targetScripts: IScripts = {};

  for (const [key, value] of Object.entries(scripts).sort(([key1], [key2]) => key1.localeCompare(key2))) {
    let values = splitCommand(value);

    if (values.length > 1) {
      values = values.map(item => {
        if (item.startsWith('npm run ')) {
          item = item.trim().replace('npm run ', '');
          item = item.trim().replace(' || true', '');
          item = item.trim();
        }
        return item;
      });
      values = values.map(item => {
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
    target: targetScripts
  };
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

    if (value.startsWith('"')) {
      while (++index < command.length && command[index] !== '"');
    }

    if (value.startsWith("'")) {
      while (++index < command.length && command[index] !== "'");
    }

    index++;
  }

  result.push(command.substr(last, index - last).trim());

  return result;
}

function getScriptDefinitions(scripts: { [name: string]: string }, preserveParams: number): { [name: string]: IScriptDefinition } {
  const definitions: { [name: string]: IScriptDefinition } = {};

  for (const [key, value] of Object.entries(scripts)) {
    const parameters = parameterize(key, value, preserveParams);
    let definition = definitions[parameters.value];

    if (definition === undefined) {
      definition = {
        keys: [],
        params: []
      };
      definitions[parameters.value] = definition;
    }

    if (!definition.keys.includes(parameters.key)) definition.keys.push(parameters.key);

    definition.params.push(parameters.params);
  }

  const sorted = Object.entries(definitions).sort(([, definition1], [, definition2]) => definition2.params.length - definition1.params.length);

  return objectFromEntries(sorted);
}

function resolveConflicts(scripts: { [name: string]: string }, name: string, command: string, params: string[][]): Array<{ name: string; command: string }> {
  if (scripts[name] === undefined) return [{ name, command }];

  const expanded = expandParams(name, command, params);
  const result: Array<{ name: string; command: string }> = [];

  for (const item of expanded) {
    result.push(...resolveConflicts(scripts, item.name, item.command, params));
  }

  return result;
}

function objectFromEntries<T>(entries: Array<[string, T]>): { [name: string]: T } {
  const object: { [name: string]: T } = {};

  for (const [name, value] of entries) {
    object[name] = value;
  }

  return object;
}

function parameterize(key: string, value: string, preserveParams: number): { key: string; value: string; params: string[] } {
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

function expandParams(name: string, command: string, params: string[][]): Array<{ name: string; command: string }> {
  let match: { index: number; value: string[] } = null;
  const length = (params.find(() => true) || { length: 0 }).length;
  const keys = name.split(':');

  for (let index = 0; index < length; index++) {
    if (keys[index].startsWith('$')) {
      const value = [...new Set(params.map(item => item[index]))];

      if (match === null || value.length <= match.value.length) {
        match = {
          index: index,
          value: value
        };
      }
    }
  }

  if (match === null) return [];

  const expression = new RegExp('\\$param' + match.index, 'g');
  const result: Array<{ name: string; command: string }> = [];

  for (const item of match.value) {
    result.push({
      name: name.replace(expression, item),
      command: command.replace(expression, item)
    });
  }

  return result;
}

function checkMigratePrerequisites(directory: string, scripts: { [name: string]: string }, testMode: boolean): boolean {
  const menuFile = path.join(directory, 'launcher-menu.json');
  const configFile = path.join(directory, 'launcher-config.json');

  if (!testMode && !checkCleanGit()) {
    console.log(Colors.Red + Colors.Bold + 'Failed:' + Colors.Normal, 'Repository is not clean. Please commit or stash any changes before updating.');
    return false;
  }

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

export async function migratePackageJson(directory: string, preserveParams: number, confirm: boolean, testMode: boolean): Promise<void> {
  const menuFile = path.join(directory, 'launcher-menu.json');
  const configFile = path.join(directory, 'launcher-config.json');
  const packageFile = path.join(directory, 'package.json');

  console.log(Colors.Bold + 'Migrating: ' + Colors.Normal + 'package.json');
  console.log();

  const content = JSON.parse(fs.readFileSync(packageFile).toString()) as { scripts: { [name: string]: string } };

  if (!checkMigratePrerequisites(directory, content.scripts, testMode)) return;

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
    menu: menuEntries
  });
  Logger.log();
  Logger.log('launcher-config.json:', {
    scripts: scripts.target
  });
  Logger.log();

  let autoValue: boolean;

  if (confirm !== undefined) autoValue = confirm;
  if (testMode) autoValue = true;

  if (await confirmPrompt('Are you sure', autoValue)) {
    console.log();
    console.log(Colors.Bold + 'Updating:' + Colors.Normal, packageFile.replace(process.cwd() + path.sep, ''));
    fs.writeFileSync(packageFile, JSON.stringify(content, null, 2) + '\n');

    console.log(Colors.Bold + 'Creating:' + Colors.Normal, menuFile.replace(process.cwd() + path.sep, ''));
    fs.writeFileSync(
      menuFile,
      JSON.stringify(
        {
          menu: menuEntries
        },
        null,
        2
      ) + '\n'
    );

    console.log(Colors.Bold + 'Creating:' + Colors.Normal, configFile.replace(process.cwd() + path.sep, ''));
    fs.writeFileSync(
      configFile,
      JSON.stringify(
        {
          scripts: scripts.target
        },
        null,
        2
      ) + '\n'
    );
  }
}
