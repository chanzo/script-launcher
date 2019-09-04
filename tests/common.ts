export type ConsoleFunction = (message?: any, ...optionalParams: any[]) => void;

export interface IConsoleFunctions {
  log: ConsoleFunction;
  debug: ConsoleFunction;
  info: ConsoleFunction;
  error: ConsoleFunction;
  trace: ConsoleFunction;
  warn: ConsoleFunction;
}

export class ConsoleInterceptor {
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
      log: (message, optionalParams) => { this.all.push(message); },
      debug: (message, optionalParams) => { this.all.push(message); },
      info: (message, optionalParams) => { this.all.push(message); },
      error: (message, optionalParams) => { this.all.push(message); },
      trace: (message, optionalParams) => { this.all.push(message); },
      warn: (message, optionalParams) => { this.all.push(message); }
    });
  }

  public close() {
    ConsoleInterceptor.setConsoleFunctions(this.functions);
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
}
