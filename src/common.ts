import deepmerge = require('deepmerge');

export enum Colors {
  Red = '\x1b[31m',
  Green = '\x1b[32m',
  Yellow = '\x1b[33m',
  Blue = '\x1b[94m',
  Cyan = '\x1b[36m',
  Bold = '\x1b[1m',
  Dim = '\x1b[2m',
  Normal = '\x1b[0m',
}

export function stringify(value: any, replacer?: (this: any, key: string, value: any) => any, space: string | number = 2): string {
  if (typeof value !== 'string') {
    value = JSON.stringify(value, replacer, space);
  }
  return value.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
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
  const result: T = {} as T;

  defaultData = defaultData instanceof Function ? defaultData() : defaultData;

  const validArguments = Object.keys(defaultData);

  for (const arg of argv) {
    if (arg === '--') break;

    const columns = arg.split('=', 2);
    const name = columns[0].replace(/^--/, '');
    let value: string | boolean | number = true;

    if (columns.length > 1) {
      if (name === columns[0]) throw new Error('Unexpected value for command (\"' + name + '\") use option syntax instead (\"--' + name + '=' + columns[1] + '\").');

      if (!validArguments.includes(name)) throw new Error('The specified option (\"--' + name + '\") is invalid.');

      value = Number.parseInt(columns[1], 10);

      if (isNaN(value)) value = columns[1];

      if (columns[1] === 'true' || columns[1] === 'false') value = columns[1] === 'true';
    } else {
      if (!validArguments.includes(name)) throw new Error('The specified command (\"' + name + '\") is invalid.');
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

  return defaultData;
}

export function showArgsHelp<T>(name: string, descriptions: { [P in keyof T]: string | string[]; }): void {
  console.log('Usage: ' + name + ' [command] [options...]');

  for (const description of Object.values(descriptions)) {
    if (!description) continue;
    if (Array.isArray(description)) {
      for (const item of Object.values(description)) {
        console.log(item);
      }
    } else {
      console.log(description);
    }
  }
}

export function getCurrentTime(): string {
  return new Date(Date.now() + (new Date().getTimezoneOffset() * -60000)).toISOString().replace('T', ' ').replace('Z', '');
}
