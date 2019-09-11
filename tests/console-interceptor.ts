import { format } from 'util';

export type ConsoleFunction = (...args: any[]) => void;

type LogTargets = 'log' | 'debug' | 'info' | 'error' | 'trace' | 'warn';

export interface IConsoleFunctions {
  log: ConsoleFunction;
  debug: ConsoleFunction;
  info: ConsoleFunction;
  error: ConsoleFunction;
  trace: ConsoleFunction;
  warn: ConsoleFunction;
}
export interface IIntercepted {
  readonly log: ReadonlyArray<string>;
  readonly debug: ReadonlyArray<string>;
  readonly info: ReadonlyArray<string>;
  readonly error: ReadonlyArray<string>;
  readonly trace: ReadonlyArray<string>;
  readonly warn: ReadonlyArray<string>;
  readonly all: ReadonlyArray<string>;
}

export class ConsoleInterceptor implements IIntercepted {
  public readonly log: string[] = [];
  public readonly debug: string[] = [];
  public readonly info: string[] = [];
  public readonly error: string[] = [];
  public readonly trace: string[] = [];
  public readonly warn: string[] = [];
  public readonly all: string[] = [];

  private readonly functions: IConsoleFunctions;
  // private readonly stdoutWrite: (buffer: Uint8Array | string, cb?: (err?: Error | null) => void) => boolean;
  private readonly stdoutWrite: (buffer: Uint8Array | string, cb?: any) => boolean;

  constructor() {
    this.functions = ConsoleInterceptor.setConsoleFunctions({
      log: (...args: any[]) => { this.recordConsole('log', ...args); },
      debug: (...args: any[]) => { this.recordConsole('debug', ...args); },
      info: (...args: any[]) => { this.recordConsole('info', ...args); },
      error: (...args: any[]) => { this.recordConsole('error', ...args); },
      trace: (...args: any[]) => { this.recordConsole('trace', ...args); },
      warn: (...args: any[]) => { this.recordConsole('warn', ...args); }
    });
    this.stdoutWrite = process.stdout.write;

    process.stdout.write = (buffer: any, cb: any) => {
      this.recordConsole('log', buffer);
      return true; // this.backup(buffer, cb);
    };
  }

  public close() {
    if (this.functions) ConsoleInterceptor.setConsoleFunctions(this.functions);
    process.stdout.write = this.stdoutWrite;
  }

  private static getConsoleFunctions(): IConsoleFunctions {
    return {
      log: console.log,
      debug: console.debug,
      info: console.info,
      error: console.error,
      trace: console.trace,
      warn: console.warn
    };
  }

  private static setConsoleFunctions(functions: Partial<IConsoleFunctions>): IConsoleFunctions {
    const currentFunctions = ConsoleInterceptor.getConsoleFunctions();

    for (const [name, value] of Object.entries(functions)) {
      (console as any)[name] = value;
    }

    return currentFunctions;
  }

  private recordConsole(name: LogTargets, ...args: any[]) {
    const value = (format as (...args: any[]) => string)(...args); // Unsing as for typing bug fix

    this.all.push(value);

    this[name].push(value);
  }

}
