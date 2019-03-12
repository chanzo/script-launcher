import { existsSync } from 'fs';
import { basename, resolve } from 'path';
import * as deepmerge from 'deepmerge';
import { Scripts } from './scripts';

export interface IScript {
  name: string;
  parameters: { [name: string]: string };
  command: string | string[] | ICommand;
}

export interface ICommand {
  concurrent: string[];
  sequential: string[];
}

export interface IMenu {
  description: string;
  [entry: string]: IMenu | string;
}

export interface IScripts {
  [key: string]: string | ICommand;
}

interface IOptions {
  logLevel: number;
  files: string[];
  script: {
    shell: boolean | string;
  };
  menu: {
    defaultScript: string | string[] | ICommand;
    defaultChoice: string;
  };
}

export interface IConfig {
  scripts: IScripts;
  menu: IMenu;
  options: IOptions;
}

export class Config {

  public static readonly default: IConfig = {
    scripts: {},
    menu: {
      description: 'entry',
    },
    options: {
      files: [
        'launcher-config.json',
        'launcher-scripts.json',
        'launcher-menu.json',
        'launcher-custom.json',
      ],
      logLevel: 0,
      script: {
        shell: true,
      },
      menu: {
        defaultChoice: '',
        defaultScript: '',
      },
    },
  };
  public static readonly init: IConfig = {
    scripts: {
      'build:$PROJECT:$CONFIGURATION': 'echo Example build: ng build --prod --no-progress --project=$PROJECT --configuration=$CONFIGURATION',
      'upload:$PROJECT:$CONFIGURATION': [
        'echo Example upload: step 1 - $PROJECT:$CONFIGURATION',
        'echo Example upload: step 2 - $PROJECT:$CONFIGURATION',
      ] as any,
      'deploy:$PROJECT:$CONFIGURATION': [
        'build:$PROJECT:$CONFIGURATION',
        'upload:$PROJECT:$CONFIGURATION',
      ] as any,
    },
    menu: {
      description: 'project',
      myProject1: {
        description: 'configuration',
        test: 'deploy:myProject1:tst',
        acceptance: 'deploy:myProject1:acc',
        production: 'deploy:myProject1:prd',
      },
      myProject2: {
        description: 'configuration',
        test: 'deploy:myProject2:tst',
        acceptance: 'deploy:myProject2:acc',
        production: 'deploy:myProject2:prd',
      },
    },
    options: {
      menu: {
        defaultChoice: 'myProject2:test',
      },
    } as IOptions,
  };

  public static load(): Config {
    let config = deepmerge<IConfig>(Config.default, Config.loadConfig('script-launcher.json'));

    config = deepmerge(config, Config.loadConfig('package.json'));

    const hash = new Set<string>();

    for (const key of Object.keys(config.scripts)) {
      const value = key.replace(/\$\w+(\:|$)/g, '$1');

      if (hash.has(value)) throw new Error('Duplicate object key: "' + key + '"');

      hash.add(value);
    }

    return new Config(config);
  }

  private static loadConfig(file: string): IConfig {
    const absolutePath = resolve(file);

    if (existsSync(absolutePath)) {
      const result = require(absolutePath);

      if (basename(file).localeCompare('package.json', [], { sensitivity: 'base' }) === 0) {
        if (!result.launcher) result.launcher = {};

        return result.launcher;
      }

      return result;
    }

    return {} as IConfig;
  }

  public readonly scripts: Scripts;
  public readonly menu: IMenu;
  public readonly options: IOptions;

  private constructor(config: IConfig) {
    // Object.entries(config).map(([key, value]) => this[key] = value);
    this.scripts = new Scripts(config.scripts);
    this.menu = config.menu;
    this.options = config.options;
  }
}
