import { stringToArgv } from './common';

export interface IScriptTask {
  confirm: string[] | string;
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
  multiple: boolean;
  parameters: { [name: string]: string };
  arguments: string[];
  script: IScript;
}

export class Scripts {
  public readonly scripts: IScripts;

  public constructor(scripts: IScripts) {
    this.scripts = scripts;
  }
  public static select(scripts: IScriptInfo[], filters: string[] = null, meta: { circular: boolean } = null): IScriptInfo {
    const length = scripts.length;

    if (!filters) filters = [];
    if (!meta) meta = { circular: false };

    if (length > 0) {
      if (scripts.some(item => item.multiple)) {
        scripts = scripts.filter(Scripts.containsScript.bind(filters));

        if (scripts.length !== length) meta.circular = true;

        const resolvedScripts = Scripts.resolveScripts(scripts) as string[];

        return {
          name: null,
          inline: false,
          multiple: true,
          parameters: {},
          arguments: [],
          script: resolvedScripts
        };
      }

      // Sort by number of values and parameters
      scripts = scripts.sort((itemA, itemB) => (Scripts.countValues(itemB.name) - Scripts.countValues(itemA.name)) * 50 + (Scripts.countParams(itemA.name) - Scripts.countParams(itemB.name)));

      for (const script of scripts) {
        if (!filters.includes(script.name)) {
          return script;
        } else {
          meta.circular = true;
        }
      }
    }

    return null;
  }

  public static parse(pattern: string): { command: string; arguments: string[] } {
    const args = stringToArgv(pattern);

    return {
      command: args.length > 0 ? args[0] : '',
      arguments: args.slice(1)
    };
  }

  public find(...patterns: string[]): IScriptInfo[] {
    const scripts: IScriptInfo[] = [];
    const multiple = patterns.length > 1;

    for (const pattern of patterns) {
      const info = Scripts.parse(pattern);

      for (const [name, script] of Object.entries(this.scripts)) {
        const parameters = Scripts.getParameters(name, info.command, multiple);

        if (parameters !== null) {
          scripts.push({
            name: name,
            inline: false,
            multiple: multiple,
            parameters: parameters,
            arguments: info.arguments,
            script: script
          });
        }
      }

      if (scripts.length === 0) {
        for (const [name, script] of Object.entries(this.scripts)) {
          const parameters = Scripts.getParameters(name, info.command, true);

          if (parameters !== null) {
            scripts.push({
              name: name,
              inline: false,
              multiple: true,
              parameters: parameters,
              arguments: info.arguments,
              script: script
            });
          }
        }
      }
    }

    return scripts;
  }

  private static containsScript(this: string[], script: IScriptInfo): boolean {
    const filters: string[] = this || [];

    return !filters.some(filter => Scripts.getParameters(script.name, filter, true) !== null);
  }

  private static resolveScripts(scripts: IScriptInfo[]): IScript[] {
    const result: IScript[] = [];

    for (const item of scripts) {
      if (item.script instanceof Array) {
        result.push(...item.script);
      } else {
        result.push(item.script);
      }
    }

    return result;
  }

  private static countParams(name: string): number {
    const columns = name.split(':');

    return columns.filter(item => item.startsWith('$')).length;
  }

  private static countValues(name: string): number {
    const columns = name.split(':');

    return columns.length - columns.filter(item => item.startsWith('$')).length;
  }

  private static getParameters(signature: string, reference: string, wildcard: boolean): { [name: string]: string } {
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

      if (wildcard && referenceParam === '*') continue;

      if (signatureParam !== referenceParam) return null;
    }

    if (signatureParams.length !== referenceParams.length + defaultParameters) return null;

    return parameters;
  }
}
