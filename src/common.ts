import deepmerge = require('deepmerge');

export enum Colors {
  Red = '\x1b[31m',
  Green = '\x1b[32m',
  Yellow = '\x1b[33m',
  Blue = '\x1b[94m',
  Orange = '\x1b[38;2;255;165;0m',
  Cyan = '\x1b[36m',
  Bold = '\x1b[1m',
  Italic = '\x1b[3m',
  Dim = '\x1b[2m',
  Normal = '\x1b[0m',
}

export function stringify(json): string {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, undefined, 2);
  }
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
    let cls = Colors.Yellow;
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = Colors.Normal;
      } else {
        cls = Colors.Green;
      }
    } else if (/true|false/.test(match)) {
      cls = Colors.Yellow;
    } else if (/null/.test(match)) {
      cls = Colors.Dim;
    }
    return cls + match + Colors.Normal;
  });
}

export function parseArgs<T>(argv: string[], defaultData: T | (() => T) | null = null): T {

  try {
    const result: T = {} as T;

    for (const arg of argv) {
      const columns = arg.split('=', 2);
      const name = columns[0].replace(/^--/, '');
      let value: string | boolean | number = true;

      if (columns.length > 1) {
        value = Number.parseInt(columns[1], 10);

        if (isNaN(value)) value = columns[1];
      }

      result[name] = value;
    }

    if (result !== null) {

      if (defaultData === null) return result;
      if (defaultData instanceof Function) return result;
      if (typeof defaultData === 'string') return result;
      if (defaultData instanceof String) return result;

      return deepmerge(defaultData, result);
    }
  } catch {
    // return the default value
  }

  if (defaultData instanceof Function) return defaultData();

  return defaultData;
}
