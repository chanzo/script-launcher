type LogWriter = (message?: any, ...optionalParams: any[]) => void;

export class Logger {
  public static readonly null: Logger = new Logger(-1);

  private static nullWriter(message?: any, ...optionalParams: any[]): void {
    // Null writer no action required
  }

  public readonly level;

  public constructor(level: number) {
    this.level = level;
  }

  public get debug(): LogWriter {
    return this.level > 2 ? console.debug : Logger.nullWriter;
  }
  public get log(): LogWriter {
    return this.level > 1 ? console.log : Logger.nullWriter;
  }
  public get info(): LogWriter {
    return this.level > 0 ? console.info : Logger.nullWriter;
  }
  public get error(): LogWriter {
    return this.level >= 0 ? console.error : Logger.nullWriter;
  }

}
