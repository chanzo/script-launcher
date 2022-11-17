type LogWriter = (message?: any, ...optionalParams: any[]) => void;

// These are the standard log-levels according to NPM (https://docs.npmjs.com/cli/v8/using-npm/logging?v=true)
export enum LogLevel {
  Silent = 'silent',
  Error = 'error',
  Warn = 'warn',
  Notice = 'notice',
  // "http" // NPM knows this loglevel, but it's not used in this project
  // "timing" // NPM knows this loglevel, but it's not used in this project
  Info = 'info',
  Verbose = 'verbose',
  Silly = 'silly'
}

export class Logger {
  public static level = LogLevel.Error;

  // --> 3 <
  public static get debug(): LogWriter {
    return this.isDebugLevelOrLower() ? console.debug : Logger.nullWriter;
  }

  // --> 2, 3
  public static get log(): LogWriter {
    return this.isLogLevelOrLower() ? console.log : Logger.nullWriter;
  }

  // --> 1, 2, 3
  public static get info(): LogWriter {
    // Silent, Verbose and Silly not included here
    return this.isInfoLevelOrLower() ? console.info : Logger.nullWriter;
  }

  // --> 0, 1, 2, 3
  public static get error(): LogWriter {
    // Errors should always be logged, except when "silent" is used
    return this.level !== LogLevel.Silent ? console.error : this.nullWriter;
  }

  public static isInfoLevelOrLower(): boolean {
    const acceptedLogLevels = [LogLevel.Info, LogLevel.Notice, LogLevel.Verbose, LogLevel.Silly];
    return acceptedLogLevels.includes(this.level);
  }

  public static isLogLevelOrLower(): boolean {
    const acceptedLogLevels = [LogLevel.Notice, LogLevel.Verbose, LogLevel.Silly];
    return acceptedLogLevels.includes(this.level);
  }

  public static isDebugLevelOrLower(): boolean {
    const acceptedLogLevels = [LogLevel.Verbose, LogLevel.Silly];
    return acceptedLogLevels.includes(this.level);
  }

  private static nullWriter(_message?: any, ..._optionalParams: any[]): void {
    // Null writer no action required
  }
}
