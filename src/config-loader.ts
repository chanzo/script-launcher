import { existsSync } from 'fs';
import { basename, resolve } from 'path';
import * as deepmerge from 'deepmerge';
import { IScript, IScripts, Scripts } from './scripts';
import * as path from 'path';
import glob = require('fast-glob');
import { LogLevel } from './logger';

export interface IMenu {
  description?: string;
  [entry: string]: IScript | IMenu;
}

interface IOptions {
  loglevel: LogLevel;
  dry: boolean;
  limit: number;
  files: string[];
  script: {
    shell: (boolean | string) | { [platform: string]: boolean | string };
  };
  glob: glob.Options;
  menu: {
    defaultScript: IScript;
    defaultChoice: string;
    defaultSelect: string;
    confirm: boolean;
    timeout: number;
    pageSize: number;
  };
}

export interface ISettings {
  [name: string]: boolean | string | number | ISettings | Array<boolean | string | number | { [name: string]: boolean | string | number }>;
}

export interface ILaunchSetting {
  values: { [name: string]: string };
  arrays: { [name: string]: Array<{ [name: string]: string }> };
}

export interface IConfig {
  scripts: IScripts;
  menu: IMenu;
  options: IOptions;
  settings: ISettings;
}

export class Config {
  public static readonly default: IConfig = {
    scripts: {},
    menu: {
      description: ''
    },
    options: {
      loglevel: LogLevel.Error,
      limit: 0,
      dry: false,
      files: ['launcher-config.json', 'launcher-scripts.json', 'launcher-settings.json', 'launcher-menu.json', 'launcher-custom.json'],
      script: {
        shell: true
      },
      glob: {},
      menu: {
        defaultChoice: '',
        defaultScript: '',
        defaultSelect: '',
        confirm: true,
        timeout: 0,
        pageSize: 7
      }
    },
    settings: {}
  };

  public readonly scripts: Scripts;
  public readonly menu: IMenu;
  public readonly options: IOptions;
  public readonly settings: ISettings;
  public get customFile(): string {
    const match = this.options.files.reverse().find(item => basename(item) === 'launcher-custom.json');

    if (match) return match;

    return 'launcher-custom.json';
  }

  public static load(directory: string): { files: string[]; config: Config } {
    const hash = new Set<string>();
    let config = new Config(Config.default);
    let files = Config.default.options.files;
    let loaded: number;
    const loadedFiles = [];

    if (!existsSync(directory)) throw Error('Directory "' + directory + '" not found.');

    do {
      loaded = 0;

      for (const file of files) {
        if (file && !hash.has(file)) {
          const fullPath = path.join(directory, file);

          try {
            if (existsSync(resolve(fullPath))) {
              config = config.merge(fullPath);
              loadedFiles.push(fullPath);
            }
          } catch (error) {
            throw new Error('Error loading config file "' + fullPath + '" ' + error);
          }

          hash.add(file);

          loaded++;
        }
      }
      files = config.options.files;
    } while (loaded > 0);

    return {
      files: loadedFiles,
      config: config
    };
  }

  public static evaluateShellOption(shellOption: (boolean | string) | { [platform: string]: boolean | string }, defaultOption: boolean | string): boolean | string {
    if (typeof shellOption !== 'object') return shellOption;

    let shell = shellOption[process.platform];

    if (shell !== undefined) return shell;

    shell = shellOption.default;

    if (shell !== undefined) return shell;

    return defaultOption;
  }

  public merge(file: string): Config {
    const absolutePath = resolve(file);
    const current: IConfig = {
      menu: this.menu,
      options: this.options,
      scripts: this.scripts.scripts,
      settings: this.settings
    };
    const config = deepmerge<IConfig>(current, require(absolutePath));

    Config.verifyScriptNames(config.scripts);

    return new Config(config);
  }

  private constructor(config: IConfig) {
    this.scripts = new Scripts(config.scripts);
    this.menu = config.menu;
    this.options = config.options;
    this.settings = config.settings;
  }

  private static verifyScriptNames(scripts: IScripts): void {
    const hash = new Set<string>();

    for (const key of Object.keys(scripts)) {
      const value = key.replace(/\$\w+(:|$)/g, '$1');

      if (hash.has(value)) throw new Error("Duplicate object key: '" + key + "'");

      hash.add(value);
    }
  }
}
