export interface IScriptTask {
  concurrent: string[];
  sequential: string[];
}

export type IScript = string | string[] | IScriptTask;

export interface IScripts {
  [name: string]: IScript;
}

export interface IScriptInfo {
  name: string;
  parameters: { [name: string]: string };
  script: IScript;
}

export class Scripts {
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

  private readonly scripts: IScripts;

  public constructor(scripts: IScripts) {
    this.scripts = scripts;
  }

  public find(pattern: string): IScriptInfo | null {
    for (const [name, script] of Object.entries(this.scripts)) {
      const parameters = Scripts.getParameters(name, pattern);

      if (parameters !== null) return { name: name, parameters, script: script };
    }

    return null;
  }
}
