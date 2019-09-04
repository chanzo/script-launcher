export type ConsoleFunction = (message?: any, ...optionalParams: any[]) => void;

export interface IConsoleFunctions {
  log: ConsoleFunction;
  debug: ConsoleFunction;
  info: ConsoleFunction;
  error: ConsoleFunction;
  trace: ConsoleFunction;
  warn: ConsoleFunction;
}
export class Common {
  public static getConsoleFunctions(): IConsoleFunctions {
    return {
      log: console.log,
      debug: console.debug,
      info: console.info,
      error: console.error,
      trace: console.trace,
      warn: console.warn
    };
  }

  public static setConsoleFunctions(functions: Partial<IConsoleFunctions>): IConsoleFunctions {
    const currentFunctions = Common.getConsoleFunctions();

    for (const [name, value] of Object.entries(functions)) {
      (console as any)[name] = value;
    }

    return currentFunctions;
  }
}
