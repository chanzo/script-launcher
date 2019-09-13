import * as spawn from 'cross-spawn';
import { ChildProcess, SpawnOptions, StdioOptions } from 'child_process';
import { Logger } from './logger';
import { Colors } from './common';
import prettyTime = require('pretty-time');
import { Readable } from 'stream';

export interface ISpawnOptions extends SpawnOptions {
  suppress?: boolean;
  testmode?: boolean;
  extraLogInfo?: (process: Process) => string;
}

export class Process {
  public static spawn(command: string, args: string[], options: ISpawnOptions): Process {
    if ((Logger.level > 1 || options.testmode) && options) {
      options = { ...options };
      options.stdio = ['inherit', 'pipe', 'pipe'];
    }

    const childProcess = spawn(command, args, options);

    if (options.cwd) Logger.log('Process dir     : ' + Colors.Green + '\'' + options.cwd + '\'' + Colors.Normal);

    return new Process(childProcess, options);
  }

  private static getStdioOption(stdio: StdioOptions, index: number): string {
    if (typeof stdio === 'string') return stdio;

    if (index < stdio.length) return stdio[index].toString();

    return '';
  }

  private static getStdout(childProcess: ChildProcess, stdio: StdioOptions, defaultValue: string): string {
    if (Process.getStdioOption(stdio, 1) === 'pipe') {
      const data = childProcess.stdout.read();

      if (data) return data.toString();
    }

    return defaultValue;
  }

  private static getStderr(childProcess: ChildProcess, stdio: StdioOptions, defaultValue: string): string {
    if (Process.getStdioOption(stdio, 2) === 'pipe') {
      const data = childProcess.stderr.read();

      if (data) return data.toString();
    }

    return defaultValue;
  }

  public readonly pid: number;
  private outputCount = 0;
  private readonly exitPromise: Promise<number>;
  private _stdout: string = '';
  private _stderr: string = '';

  private constructor(childProcess: ChildProcess, options: ISpawnOptions) {
    const startTime = process.hrtime();

    this.pid = childProcess.pid;

    if (Logger.level > 1) {
      Logger.log('Process pid     : ' + Colors.Yellow + childProcess.pid + Colors.Normal);

      this.showOutputData(childProcess);
    } else {
      if (options.testmode) this.testOutputData(childProcess);
    }

    this.exitPromise = new Promise<number>((resolve, reject) => {
      try {

        childProcess.on('exit', (code, signal) => {
          this._stdout = Process.getStdout(childProcess, options.stdio, this._stdout);
          this._stderr = Process.getStderr(childProcess, options.stdio, this._stderr);

          const timespan = process.hrtime(startTime);

          if (this.outputCount !== 0) Logger.log(''.padEnd(process.stdout.columns, '-'));

          const extraInfo = options.extraLogInfo ? '  ' + options.extraLogInfo(this) : '';

          Logger.log('Process exited  : pid=' + childProcess.pid + '  code=' + code + '  signal=' + signal, '  elapsed=' + prettyTime(timespan, 'ms') + extraInfo);
          Logger.log();
          Logger.log();

          if (options.suppress) code = 0;

          resolve(code);
        });

        childProcess.on('error', (error) => {
          this._stdout = Process.getStdout(childProcess, options.stdio, this._stdout);
          this._stderr = Process.getStderr(childProcess, options.stdio, this._stderr);

          const timespan = process.hrtime(startTime);

          if (this.outputCount !== 0) Logger.log(''.padEnd(process.stdout.columns, '-'));

          const extraInfo = options.extraLogInfo ? '  ' + options.extraLogInfo(this) : '';

          Logger.log('Process error   : pid=' + childProcess.pid + `  code=${error}`, '  elapsed=' + prettyTime(timespan, 'ms') + extraInfo);
          Logger.log();
          Logger.log();

          if (options.suppress) {
            resolve(0);
          } else {
            reject(error);
          }
        });
      } catch (error) {
        if (this.outputCount !== 0) Logger.log(''.padEnd(process.stdout.columns, '-'));
        Logger.error('Process failed  : pid=' + childProcess.pid + `  failed to attach event emitters, ${error}.`);
        Logger.log();
        Logger.log();
        reject(error);
      }
    });
  }

  public wait(): Promise<number> {
    return this.exitPromise;
  }

  get stdout(): string {
    return this._stdout;
  }

  get stderr(): string {
    return this._stderr;
  }

  private showOutputData(childProcess: ChildProcess): void {
    childProcess.stdout.on('data', (data) => {
      const content = (data.toString() as string).trim();
      if (content) {
        this._stdout += content;

        if (this.outputCount === 0) Logger.log(''.padEnd(process.stdout.columns, '-'));

        Logger.log(Colors.Dim + content + Colors.Normal);

        this.outputCount++;
      }
    });

    childProcess.stderr.on('data', (data) => {
      const content = (data.toString() as string).trim();
      if (content) {
        this._stderr += content;

        if (this.outputCount === 0) Logger.log(''.padEnd(process.stdout.columns, '-'));

        Logger.log(Colors.Red + content + Colors.Normal);

        this.outputCount++;
      }
    });
  }

  private testOutputData(childProcess: ChildProcess): void {

    childProcess.stdout.on('data', (data) => {
      const content = (data.toString() as string).trim();
      if (content) {
        this._stdout += content;

        process.stdout.write(content);
      }
    });

    childProcess.stderr.on('data', (data) => {
      const content = (data.toString() as string).trim();
      if (content) {
        this._stderr += content;

        process.stderr.write(content);
      }
    });
  }
}
