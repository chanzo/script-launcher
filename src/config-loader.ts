import { existsSync } from 'fs';
import { basename, resolve } from 'path';
import * as deepmerge from 'deepmerge';

export interface IScript {
  name: string;
  parameters: { [name: string]: string };
  command: string | ICommand;
}

export interface ICommand {
  concurrent: string[];
  sequential: string[];
}

export interface IMenu {
  description: string;
  [entry: string]: IMenu | string;
}

interface IScripts {
  [key: string]: string | ICommand;
}

interface IConfigurations {
  logLevel: number;
  script: {
    scriptShell: string;
    nestedShell: string;
  };
  menu: { default: string; };
}

interface IConfig {
  scripts: IScripts;
  menu: IMenu;
  configurations: IConfigurations;
}

export class Config implements IConfig {
  public static readonly default: IConfig = {
    scripts: {},
    menu: {
      description: 'entry',
    },
    configurations: {
      logLevel: 0,
      script: {
        scriptShell: 'cross-env-shell',
        nestedShell: 'npm start --silent',
      },
      menu: {
        default: '',
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
    configurations: {
      logLevel: 0,
      script: {
        scriptShell: 'cross-env-shell',
      } as any,
      menu: {
        default: '',
      },
    },
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

  private static getParameters(patternA: string, patternB: string): { [name: string]: string } {
    const columnsA = patternA.split(':');
    const columnsB = patternB.split(':');
    const parameters: { [name: string]: string } = {};

    if (columnsA.length !== columnsB.length) return null;

    for (let index = 0; index < columnsA.length; index++) {
      const itemA = columnsA[index];
      const itemB = columnsB[index];

      if (itemB.trim().startsWith('$')) {
        parameters[itemB.trim().substr(1)] = itemA;

        continue;
      }

      if (itemA.trim().startsWith('$')) {
        parameters[itemA.trim().substr(1)] = itemB;

        continue;
      }

      if (itemA !== itemB) return null;
    }

    return parameters;
  }

  public readonly scripts: IScripts;
  public readonly menu: IMenu;
  public readonly configurations: IConfigurations;

  private constructor(config: IConfig) {
    Object.entries(config).map(([key, value]) => this[key] = value);
  }

  public findScript(pattern: string): IScript | null {

    for (const [key, command] of Object.entries(this.scripts)) {
      const parameters = Config.getParameters(key, pattern);

      if (parameters !== null) return { name: pattern, parameters, command };
    }

    throw new Error('Missing launch script: ' + pattern);
  }

  public findScriptOld(pattern: string): IScript | null {

    for (const [key, command] of Object.entries(this.scripts)) {
      const parameters = Config.getParameters(key, pattern);

      if (parameters !== null) return { name: '', parameters, command };
    }

    throw new Error('Missing launch script: ' + pattern);
  }

  public findScript2(pattern: string, args: string[]): IScript | null {

    for (const [key, command] of Object.entries(this.scripts)) {
      for (let index = 0; index < args.length; index++) {
        const name = [pattern, ...args.slice(0, args.length - index)].join(':');
        const parameters = Config.getParameters(key, name);

        if (parameters !== null) return { name, parameters, command };
      }
    }

    throw new Error('Missing launch script: ' + pattern);
  }
}
