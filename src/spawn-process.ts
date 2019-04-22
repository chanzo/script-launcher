import * as spawn from 'cross-spawn';
import { ChildProcess, SpawnOptions } from 'child_process';
import { Logger } from './logger';
import { Colors } from './common';

export interface ISpawnOptions extends SpawnOptions {
  suppress?: boolean;
}

export class Process {
  public static spawn(command: string, args: string[], options: ISpawnOptions): Process {
    if (Logger.level > 1 && options) {
      options = { ...options };
      options.stdio = ['inherit', 'pipe', 'pipe'];
    }

    const startTime = Date.now();
    const childProcess = spawn(command, args, options);

    if (options.cwd) Logger.log('Process dir     : ' + Colors.Green + '"' + options.cwd + '"' + Colors.Normal);

    return new Process(childProcess, startTime, options);
  }

  public readonly pid: number;
  private outputCount = 0;
  private readonly exitPromise: Promise<number>;

  private constructor(childProcess: ChildProcess, startTime: number, options: ISpawnOptions) {
    this.pid = childProcess.pid;

    if (Logger.level > 1) {
      Logger.log('Process pid     : ' + Colors.Yellow + childProcess.pid + Colors.Normal);

      this.showOutputData(childProcess);
    }

    this.exitPromise = new Promise<number>((resolve, reject) => {
      try {

        childProcess.on('exit', (code, signal) => {
          const timeSpan = Date.now() - startTime;

          if (this.outputCount !== 0) Logger.log(''.padEnd(process.stdout.columns, '-'));

          Logger.log('Process exited  : pid=' + childProcess.pid + '  code=' + code + '  signal=' + signal, '  elapsed=' + timeSpan + ' ms');
          Logger.log();
          Logger.log();

          if (options.suppress) code = 0;

          resolve(code);
        });

        childProcess.on('error', (error) => {
          const timeSpan = Date.now() - startTime;

          if (this.outputCount !== 0) Logger.log(''.padEnd(process.stdout.columns, '-'));
          Logger.log('Process error   : pid=' + childProcess.pid + `  code=${error}`, '  elapsed=' + timeSpan + ' ms');
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

  private showOutputData(childProcess: ChildProcess): void {
    childProcess.stdout.on('data', (data) => {
      const content = (data.toString() as string).trim();
      if (content) {
        if (this.outputCount === 0) Logger.log(''.padEnd(process.stdout.columns, '-'));

        Logger.log(Colors.Dim + content + Colors.Normal);

        this.outputCount++;
      }
    });

    childProcess.stderr.on('data', (data) => {
      const content = (data.toString() as string).trim();
      if (content) {
        if (this.outputCount === 0) Logger.log(''.padEnd(process.stdout.columns, '-'));

        Logger.log(Colors.Red + content + Colors.Normal);

        this.outputCount++;
      }
    });
  }
}
