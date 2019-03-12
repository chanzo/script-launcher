import { existsSync } from 'fs';
import { basename, resolve } from 'path';
import * as deepmerge from 'deepmerge';
import { IScript, IScripts, Scripts } from './scripts';

export interface IMenu {
  description: string;
  [entry: string]: IScript | IMenu;
}

interface IOptions {
  logLevel: number;
  files: string[];
  script: {
    shell: boolean | string;
  };
  menu: {
    defaultScript: IScript;
    defaultChoice: string;
  };
}

export interface IConfig {
  scripts: IScripts;
  menu: IMenu;
  options: IOptions;
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
      ],
      'deploy:$PROJECT:$CONFIGURATION': [
        'build:$PROJECT:$CONFIGURATION',
        'upload:$PROJECT:$CONFIGURATION',
      ],
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
    const hash = new Set<string>();
    let config = Config.default;
    let files = Config.default.options.files;
    let loaded: number;

    do {
      loaded = 0;

      for (const file of files) {
        if (file && !hash.has(file)) {
          config = deepmerge<IConfig>(config, Config.loadConfig(file));

          hash.add(file);

          loaded++;
        }
      }
      files = config.options.files;
    } while (loaded > 0);

    Config.verifyScriptNames(config.scripts);

    return new Config(config);
  }

  private static verifyScriptNames(scripts: IScripts) {
    const hash = new Set<string>();

    for (const key of Object.keys(scripts)) {
      const value = key.replace(/\$\w+(\:|$)/g, '$1');

      if (hash.has(value)) throw new Error('Duplicate object key: "' + key + '"');

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

  private constructor(config: IConfig) {
    this.scripts = new Scripts(config.scripts);
    this.menu = config.menu;
    this.options = config.options;
  }
}
