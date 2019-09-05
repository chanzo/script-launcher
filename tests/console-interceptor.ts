import { format } from 'util';

export type ConsoleFunction = (message?: any, ...optionalParams: any[]) => void;

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

  constructor() {
    this.functions = ConsoleInterceptor.setConsoleFunctions({
      log: (message?: any, ...optionalParams: any[]) => { this.recordLog('log', message, ...optionalParams); },
      debug: (message?: any, ...optionalParams: any[]) => { this.recordLog('debug', message, ...optionalParams); },
      info: (message?: any, ...optionalParams: any[]) => { this.recordLog('info', message, ...optionalParams); },
      error: (message?: any, ...optionalParams: any[]) => { this.recordLog('error', message, ...optionalParams); },
      trace: (message?: any, ...optionalParams: any[]) => { this.recordLog('trace', message, ...optionalParams); },
      warn: (message?: any, ...optionalParams: any[]) => { this.recordLog('warn', message, ...optionalParams); }
    });
  }

  public close() {
    if (this.functions) ConsoleInterceptor.setConsoleFunctions(this.functions);
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

  private recordLog(name: LogTargets, message?: any, ...optionalParams: any[]) {
    const value = format(message, ...optionalParams);

    this.all.push(value);

    this[name].push(value);
  }

}
