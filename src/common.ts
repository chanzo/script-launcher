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

export function extractOptions<A extends {}>(knownOptions: A, environmentVariables: {}): A {
  // Reading arguments from process environment variables
  for (const knownOptionName of Object.keys(knownOptions)) {
    let optionName = knownOptionName;

    // Special treatment for dryRun here as NPM does have an own dry_run flag
    //  which is recognized by various spellings e.g. --dry, --dryRun, --dry-run
    if (knownOptionName === 'dry') {
      optionName = 'dry_run';
    }

    const optionValue = environmentVariables['npm_config_' + optionName.toLowerCase()];
    const parsedValue = parseValue(optionValue);
    const defaultValue = knownOptions[knownOptionName];

    // Check if the value given is the same type as the default one
    if (defaultValue !== null && defaultValue !== undefined && parsedValue !== null && parsedValue !== undefined && typeof defaultValue !== typeof parsedValue) {
      throw new Error(`Unexpected type "${typeof parsedValue}" for option "${knownOptionName}". The option should be of type "${typeof defaultValue}".`);
    }

    // Adding value only if it exists. Otherwise, the default value for the option (maybe written by config file) would be replaced
    if (optionValue !== undefined && optionValue !== null) {
      knownOptions[knownOptionName] = parsedValue;
    }
  }

  return knownOptions;
}

export function extractCommands<C extends {}>(commands: C, argv: string[]): C {
  const internalCommandNames = Object.keys(commands);

  let commandFound = false;

  for (const rawCommand of argv) {
    // Everything behind "--" is passed as an argument
    if (rawCommand === '--') break;

    const splitRawArgument = rawCommand.split('=', 2);
    const [name, value] = splitRawArgument;

    // There is at least a value given for the argument
    if (value !== undefined) {
      throw new Error(`Unexpected value for command ("${name}"). Use option syntax instead for arguments ("--${name}=${value}").`);
    } else {
      if (!commandFound) {
        // If the command was an internal one (e.g. "help"), add it to the list
        if (internalCommandNames.includes(name)) {
          commands[name] = true;
        }

        commandFound = true;
      }
    }
  }

  return commands;
}

function parseValue(rawValue: string | number | boolean): string | number | boolean {
  // Check if the rawValue is a boolean
  if (rawValue === 'true' || rawValue === 'false') {
    return rawValue === 'true';
  }

  const integer = Number.parseInt(rawValue as string, 10);

  // Try parse it as a number
  if (!isNaN(integer)) {
    return integer;
  }

  // If it is neither a boolean nor a number, it must be a string
  return rawValue;
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
  private readonly resolvers: Array<(value?: number | PromiseLike<number>) => void>;
  private currentCount: number;

  public constructor(private readonly maximumCount: number) {
    this.currentCount = 0;

    this.resolvers = [];
  }

  public async enter(): Promise<number> {
    return new Promise((resolve, _reject) => {
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
