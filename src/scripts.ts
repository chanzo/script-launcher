import { parseArgsStringToArgv } from 'string-argv';

export interface IScriptTask {
  condition: string[] | string;
  exclusion: string[] | string;
  repeater: string;
  concurrent: IScript[] | string;
  sequential: IScript[] | string;
  'concurrent-then': IScript[] | string;
  'sequential-then': IScript[] | string;
  'concurrent-else': IScript[] | string;
  'sequential-else': IScript[] | string;
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
      // Sort by number of values and parameters
      scripts = scripts.sort((itemA, itemB) => (Scripts.countValues(itemB.name) - Scripts.countValues(itemA.name)) * 50 + (Scripts.countParams(itemA.name) - Scripts.countParams(itemB.name)));

      for (const script of scripts) {
        if (script.name !== filter) return script;
      }
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

  private static countParams(name: string): number {
    const columns = name.split(':');

    return columns.filter((item) => item.startsWith('$')).length;
  }

  private static countValues(name: string): number {
    const columns = name.split(':');

    return columns.length - columns.filter((item) => item.startsWith('$')).length;
  }

  private static getParameters(signature: string, reference: string): { [name: string]: string } {
    const signatureParams = signature.split(':');
    const referenceParams = reference.split(':');
    const parameters: { [name: string]: string } = {};
    let defaultParameters = 0;

    if (signatureParams.length < referenceParams.length) return null;

    for (let index = 0; index < signatureParams.length; index++) {
      const signatureParam = signatureParams[index];
      const referenceParam = referenceParams[index];

      if (signatureParam.trim().startsWith('$')) {
        const columns = signatureParam.trim().substr(1).split('=');
        const name = columns[0];

        parameters[name] = referenceParam;

        if (!referenceParam) {
          parameters[name] = columns[1];

          if (columns[1] !== undefined && referenceParam === undefined) defaultParameters++;
        }

        continue;
      }

      if (signatureParam !== referenceParam) return null;
    }

    if (signatureParams.length !== referenceParams.length + defaultParameters) return null;

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
