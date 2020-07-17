import deepmerge = require('deepmerge');
import { ConfirmPrompt } from 'prompts/lib/elements';
import { Prompt } from 'prompts/lib/elements';
import { IOptions } from 'prompts/lib';

export enum Colors {
  Red = '\x1b[31m',
  Green = '\x1b[32m',
  Yellow = '\x1b[33m',
  Blue = '\x1b[94m',
  Cyan = '\x1b[36m',
  Bold = '\x1b[1m',
  Dim = '\x1b[2m',
  Normal = '\x1b[0m'
}

export function stringify(value: any, replacer?: (this: any, key: string, value: any) => any, space: string | number = 2): string {
  if (typeof value !== 'string') {
    value = JSON.stringify(value, replacer, space);
  }

  return value.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => {
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

interface IArguments<T> {
  arguments: T;
  optionals: string[];
  unknowns: string[];
}

export function parseArgs<T>(argv: string[], defaultData: IArguments<T> | (() => IArguments<T>) | null = null): IArguments<T> {
  const result: IArguments<T> = {
    arguments: {} as T,
    optionals: [],
    unknowns: []
  };

  defaultData = defaultData instanceof Function ? defaultData() : defaultData;

  const validArguments = Object.keys(defaultData.arguments);
  let commandFound = false;

  for (const arg of argv) {
    if (arg === '--') break;

    const columns = arg.split('=', 2);
    const name = columns[0].replace(/^--/, '');
    let value: string | boolean | number = true;

    if (columns.length > 1) {
      if (name === columns[0]) throw new Error('Unexpected value for command ("' + name + '") use option syntax instead ("--' + name + '=' + columns[1] + '").');

      if (!validArguments.includes(name)) throw new Error('The specified option ("--' + name + '") is invalid.');

      value = Number.parseInt(columns[1], 10);

      if (isNaN(value)) value = columns[1];

      if (columns[1] === 'true' || columns[1] === 'false') value = columns[1] === 'true';

      const defaultArgument = defaultData.arguments[name];

      if (defaultArgument !== null && defaultArgument !== undefined && typeof defaultData.arguments[name] !== typeof value) {
        throw new Error('Unexpected type "' + typeof value + '" for argument "' + name + '". The argument should be of type "' + typeof defaultData[name] + '".');
      }
    } else {
      if (!commandFound) {
        if (!validArguments.includes(name)) {
          result.unknowns.push(name);
          continue;
        }

        if (!columns[0].startsWith('--')) commandFound = true;
      } else {
        result.optionals.push(name);
        continue;
      }
    }

    result.arguments[name] = value;
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

export function showArgsHelp<T>(name: string, descriptions: { [P in keyof T]: string | string[] }): void {
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

export function formatTime(time: number = Date.now(), timezoneOffset = new Date().getTimezoneOffset() * -60000): string {
  return new Date(time + timezoneOffset).toISOString().replace('T', ' ').replace('Z', '');
}

export function toPromise(prompt: Prompt, options: IOptions = {}): Promise<any> {
  const dummyHandler = (...args: any[]) => args;
  const onState = options.onState || dummyHandler;
  const onAbort = options.onAbort || dummyHandler;
  const onSubmit = options.onSubmit || dummyHandler;

  return new Promise((resolve, reject) => {
    prompt.on('state', onState);
    prompt.on('submit', args => resolve(onSubmit(args)));
    prompt.on('abort', args => reject(onAbort(args)));
  });
}

export async function confirmPrompt(message: string, autoValue?: boolean, defaultValue: boolean = false): Promise<boolean> {
  const confirmPrompt = new ConfirmPrompt({
    type: 'confirm',
    name: 'value',
    initial: autoValue !== undefined ? autoValue : defaultValue,
    message: message
  });

  const confirmPromise = toPromise(confirmPrompt);

  if (autoValue !== undefined) confirmPrompt.submit();

  const choice = await confirmPromise;

  return choice[0] as boolean;
}

export function stringToArgv(value: string): string[] {
  const result: string[] = [];
  const spaces = '\t ';
  const quotes = '"\'';
  let start = 0;
  let index = 0;

  function scanSpace(): string {
    if (!(spaces + quotes).includes(value[index])) {
      start = index;
      while (index < value.length && !(spaces + quotes).includes(value[index])) index++;

      return value.substr(start, index - start);
    }

    return null;
  }

  function scanQuote(): string {
    if (value[index] === "'") {
      start = ++index;
      while (index < value.length && value[index] !== "'") index++;

      return value.substr(start, index++ - start);
    }

    if (value[index] === '"') {
      start = ++index;
      while (index < value.length && value[index] !== '"') index++;

      return value.substr(start, index++ - start);
    }

    return null;
  }

  let param = null;

  while (index < value.length) {
    if (!spaces.includes(value[index])) {
      if (param === null) param = '';

      const quoteParam = scanQuote();

      if (quoteParam !== null) {
        param += quoteParam;
        continue;
      }

      const spaceParam = scanSpace();

      if (spaceParam !== null) {
        param += spaceParam;
        continue;
      }
    }

    if (param !== null) {
      result.push(param);
      param = null;
    }

    index++;
  }

  if (param !== null) {
    result.push(param);
    param = null;
  }

  return result;
}

export class Limiter {
  private resolvers: Array<(value?: number | PromiseLike<number>) => void>;
  private currentCount: number;
  private maximumCount: number;
  public constructor(maximum: number) {
    this.currentCount = 0;
    this.maximumCount = maximum;

    this.resolvers = [];
  }

  public async enter(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (this.currentCount < this.maximumCount) {
        this.currentCount++;

        resolve(this.currentCount);

        return;
      }

      this.resolvers.push(resolve);
    });
  }

  public leave(): number {
    this.currentCount--;

    while (this.currentCount < this.maximumCount && this.resolvers.length > 0) {
      const resolver = this.resolvers[0];

      this.resolvers.shift();

      this.currentCount++;

      resolver(this.currentCount);
    }

    return this.currentCount;
  }
}
