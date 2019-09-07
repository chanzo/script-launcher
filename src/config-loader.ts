import { existsSync } from 'fs';
import { basename, resolve } from 'path';
import * as deepmerge from 'deepmerge';
import { IScript, IScripts, Scripts } from './scripts';
import * as path from 'path';
import glob = require('glob');

export interface IMenu {
  description: string;
  [entry: string]: IScript | IMenu;
}

interface IOptions {
  logLevel: number;
  files: string[];
  script: {
    shell: (boolean | string) | { [platform: string]: boolean | string };
  };
  glob: glob.IOptions;
  menu: {
    defaultScript: IScript;
    defaultChoice: string;
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

  get customFile(): string {
    const match = this.options.files.reverse().find((item) => basename(item) === 'launcher-custom.json');

    if (match) return match;

    return 'launcher-custom.json';
  }

  public static readonly default: IConfig = {
    scripts: {},
    menu: {
      description: '',
    },
    options: {
      logLevel: 0,
      files: [
        'launcher-config.json',
        'launcher-scripts.json',
        'launcher-settings.json',
        'launcher-menu.json',
        'launcher-custom.json',
      ],
      script: {
        shell: true,
      },
      glob: {},
      menu: {
        defaultChoice: '',
        defaultScript: '',
        pageSize: 7,
      },
    },
    settings: {

    },
  };

  public static readonly initConfig: Partial<IConfig> = {
    scripts: {
      'serve:dev': {
        concurrent: [
          'echo Start development server',
          'serve:dev',
        ],
      } as IScript,
      'serve:$config': 'echo ng serve --configuration=$config --deploy-url $launch_setting_${config}_url',
      'build:$config': 'echo ng build --configuration=$config --deploy-url $launch_setting_${config}_url',
      'build:dev': 'build:dev',
    },
  };

  public static readonly settingsConfig: Partial<IConfig> = {
    settings: {
      dev: {
        url: 'example.dev.com',
      },
      acc: {
        url: 'example.acc.com',
      },
      production: {
        url: 'example.prd.com',
      },
    },
    options: {
      logLevel: 0,
    } as IOptions,
  };

  public static readonly initMenu: Partial<IConfig> = {
    menu: {
      description: 'action',
      serve: {
        description: 'environment',
        development: 'serve:dev',
        acceptance: 'serve:acc',
        production: 'serve:production',
      },
      build: {
        description: 'environment',
        development: 'build:dev',
        acceptance: 'build:acc',
        production: 'build:production',
      },
    },
    options: {
      menu: {
        defaultChoice: 'serve:development',
      },
    } as IOptions,

  };

  public static load(directory: string): Config {
    const hash = new Set<string>();
    let config = new Config(Config.default);
    let files = Config.default.options.files;
    let loaded: number;

    do {
      loaded = 0;

      for (const file of files) {
        if (file && !hash.has(file)) {
          const fullPath = path.join(directory, file);

          if (existsSync(resolve(fullPath))) config = config.merge(fullPath);

          hash.add(file);

          loaded++;
        }
      }
      files = config.options.files;
    } while (loaded > 0);

    return config;
  }

  public static evaluateShellOption(shellOption: (boolean | string) | { [platform: string]: boolean | string }, defaultOption: boolean | string): boolean | string {

    if (typeof shellOption !== 'object') return shellOption;

    let shell = shellOption[process.platform];

    if (shell !== undefined) return shell;

    shell = shellOption.default;

    if (shell !== undefined) return shell;

    return defaultOption;
  }

  private static verifyScriptNames(scripts: IScripts) {
    const hash = new Set<string>();

    for (const key of Object.keys(scripts)) {
      const value = key.replace(/\$\w+(\:|$)/g, '$1');

      if (hash.has(value)) throw new Error('Duplicate object key: \'' + key + '\'');

      hash.add(value);
    }
  }

  private static loadConfig(file: string): IConfig {
    const absolutePath = resolve(file);

    if (existsSync(absolutePath)) {
      return require(absolutePath);
    }

    return {} as IConfig;
  }

  public readonly scripts: Scripts;
  public readonly menu: IMenu;
  public readonly options: IOptions;
  public readonly settings: ISettings;

  private constructor(config: IConfig) {
    this.scripts = new Scripts(config.scripts);
    this.menu = config.menu;
    this.options = config.options;
    this.settings = config.settings;
  }

  public merge(file: string): Config {
    const absolutePath = resolve(file);
    const current: IConfig = {
      menu: this.menu,
      options: this.options,
      scripts: this.scripts.scripts,
      settings: this.settings,
    };
    const config = deepmerge<IConfig>(current, require(absolutePath));

    Config.verifyScriptNames(config.scripts);

    return new Config(config);
  }
}
