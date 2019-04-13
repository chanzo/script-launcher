import * as spawn from 'cross-spawn';
import { ChildProcess, SpawnOptions } from 'child_process';
import { Logger } from './logger';
import { Colors } from './common';

export class Process {
  public static spawn(command: string, args: string[], options: SpawnOptions): Process {
    if (Logger.level > 1 && options) {
      options = { ...options };
      options.stdio = ['inherit', 'pipe', 'pipe'];
    }

    const startTime = Date.now();
    const childProcess = spawn(command, args, options);

    if (options.cwd) Logger.log('Process dir     : ' + Colors.Green + '"' + options.cwd + '"' + Colors.Normal);

    if (Logger.level > 1) {
      Logger.log('Process pid     : ' + Colors.Yellow + childProcess.pid + Colors.Normal);
      Logger.log(''.padEnd(process.stdout.columns, '-'));

      Process.showOutputData(childProcess);
    }

    return new Process(childProcess, startTime);
  }

  private static showOutputData(childProcess: ChildProcess): void {
    childProcess.stdout.on('data', (data) => {
      const content = (data.toString() as string).trim();
      if (content) Logger.log(Colors.Dim + content + Colors.Normal);
    });

    childProcess.stderr.on('data', (data) => {
      const content = (data.toString() as string).trim();
      if (content) Logger.log(Colors.Red + content + Colors.Normal);
    });
  }

  public readonly pid: number;

  private readonly exitPromise: Promise<number>;

  private constructor(childProcess: ChildProcess, startTime: number) {
    this.pid = childProcess.pid;

    this.exitPromise = new Promise<number>((resolve, reject) => {
      try {

        childProcess.on('exit', (code, signal) => {
          const timeSpan = Date.now() - startTime;

          Logger.log(''.padEnd(process.stdout.columns, '-'));
          Logger.log('Process exited  : pid=' + childProcess.pid + '  code=' + code + '  signal=' + signal, '  elapsed=' + timeSpan + ' ms');
          Logger.log();
          Logger.log();

          resolve(code);
        });

        childProcess.on('error', (error) => {
          const timeSpan = Date.now() - startTime;

          Logger.log(''.padEnd(process.stdout.columns, '-'));
          Logger.log('Process error   : pid=' + childProcess.pid + `  code=${error}`, '  elapsed=' + timeSpan + ' ms');
          Logger.log();
          Logger.log();
          reject(error);
        });
      } catch (error) {
        Logger.log(''.padEnd(process.stdout.columns, '-'));
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
}
