import { parseArgsStringToArgv } from 'string-argv';

export interface IScriptTask {
  condition: string[] | string;
  exclusion: string[] | string;
  concurrent: IScript[] | string;
  sequential: IScript[] | string;
}

export type IScript = string | string[] | IScriptTask;

export interface IScripts {
  [name: string]: IScript;
}

export interface IScriptInfo {
  name: string;
  inline: boolean;
  parameters: { [name: string]: string };
  arguments: string[];
  script: IScript;
}

export class Scripts {
  public static select(scripts: IScriptInfo[], filter: string = null): IScriptInfo {
    if (scripts.length > 0) {
      scripts = scripts.sort((itemA, itemB) => itemA.name.split('$').length - itemB.name.split('$').length);

      for (const script of scripts) {
        if (script.name !== filter) return script;
      }

      throw new Error('Circular script reference detected.');
    }

    return null;
  }

  public static parse(pattern: string): { command: string, arguments: string[] } {
    const args = parseArgsStringToArgv(pattern);

    return {
      command: args.length > 0 ? args[0] : '',
      arguments: args.slice(1),
    };
  }

  private static getParameters(patternA: string, patternB: string): { [name: string]: string } {
    const columnsA = patternA.split(':');
    const columnsB = patternB.split(':');
    const parameters: { [name: string]: string } = {};

    if (columnsA.length !== columnsB.length) return null;

    for (let index = 0; index < columnsA.length; index++) {
      const itemA = columnsA[index];
      const itemB = columnsB[index];

      if (itemA.trim().startsWith('$')) {
        parameters[itemA.trim().substr(1)] = itemB;

        continue;
      }

      if (itemA !== itemB) return null;
    }

    return parameters;
  }

  public readonly scripts: IScripts;

  public constructor(scripts: IScripts) {
    this.scripts = scripts;
  }

  public find(pattern: string): IScriptInfo[] {
    const info = Scripts.parse(pattern);
    const scripts: IScriptInfo[] = [];

    for (const [name, script] of Object.entries(this.scripts)) {
      const parameters = Scripts.getParameters(name, info.command);

      if (parameters !== null) {
        scripts.push({
          name: name,
          inline: false,
          parameters: parameters,
          arguments: info.arguments,
          script: script,
        });
      }
    }

    return scripts;
  }
}
