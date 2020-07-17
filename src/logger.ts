type LogWriter = (message?: any, ...optionalParams: any[]) => void;

export class Logger {
  public static level = 0;

  public static get debug(): LogWriter {
    return Logger.level > 2 ? console.debug : Logger.nullWriter;
  }
  public static get log(): LogWriter {
    return Logger.level > 1 ? console.log : Logger.nullWriter;
  }
  public static get info(): LogWriter {
    return Logger.level > 0 ? console.info : Logger.nullWriter;
  }
  public static get error(): LogWriter {
    return Logger.level >= 0 ? console.error : Logger.nullWriter;
  }

  private static nullWriter(message?: any, ...optionalParams: any[]): void {
    // Null writer no action required
  }
}
