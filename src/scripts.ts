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

  private static getParameters(signature: string, reference: string): { [name: string]: string } {
    const signatureParams = signature.split(':');
    const referenceParams = reference.split(':');
    const parameters: { [name: string]: string } = {};

    if (signatureParams.length !== referenceParams.length) return null;

    for (let index = 0; index < signatureParams.length; index++) {
      const signatureParam = signatureParams[index];
      const referenceParam = referenceParams[index];

      if (signatureParam.trim().startsWith('$')) {
        parameters[signatureParam.trim().substr(1)] = referenceParam;

        continue;
      }

      if (signatureParam !== referenceParam) return null;
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
