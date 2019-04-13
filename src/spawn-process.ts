import * as spawn from 'cross-spawn';
import { ChildProcess, SpawnOptions } from 'child_process';
import { Logger } from './logger';
import { Colors } from './common';

export class Process {
  public static spawn(command: string, args: string[], options: SpawnOptions, logger: Logger): Process {
    if (logger.level > 1 && options) {
      options = { ...options };
      options.stdio = ['inherit', 'pipe', 'pipe'];
    }

    const startTime = Date.now();
    const childProcess = spawn(command, args, options);

    if (options.cwd) logger.log('Process dir     : ' + Colors.Green + '"' + options.cwd + '"' + Colors.Normal);

    if (logger.level > 1) {
      logger.log('Process pid     : ' + Colors.Yellow + childProcess.pid + Colors.Normal);
      logger.log(''.padEnd(process.stdout.columns, '-'));

      Process.showOutputData(childProcess, logger);
    }

    return new Process(childProcess, startTime, logger);
  }

  private static showOutputData(childProcess: ChildProcess, logger: Logger): void {
    childProcess.stdout.on('data', (data) => {
      const content = (data.toString() as string).trim();
      if (content) logger.log(Colors.Dim + Colors.Italic + content + Colors.Normal);
    });

    childProcess.stderr.on('data', (data) => {
      const content = (data.toString() as string).trim();
      if (content) logger.log(Colors.Red + Colors.Italic + content + Colors.Normal);
    });
  }

  public readonly pid: number;

  private readonly exitPromise: Promise<number>;

  private constructor(childProcess: ChildProcess, startTime: number, logger: Logger) {
    this.pid = childProcess.pid;

    this.exitPromise = new Promise<number>((resolve, reject) => {
      try {

        childProcess.on('exit', (code, signal) => {
          const timeSpan = Date.now() - startTime;

          logger.log(''.padEnd(process.stdout.columns, '-'));
          logger.log('Process exited  : pid=' + childProcess.pid + '  code=' + code + '  signal=' + signal, '  timespan=' + timeSpan + ' ms');
          logger.log();
          logger.log();

          resolve(code);
        });

        childProcess.on('error', (error) => {
          const timeSpan = Date.now() - startTime;

          logger.log(''.padEnd(process.stdout.columns, '-'));
          logger.log('Process error   : pid=' + childProcess.pid + `  code=${error}`, '  timespan=' + timeSpan + ' ms');
          logger.log();
          logger.log();
          reject(error);
        });
      } catch (error) {
        logger.log(''.padEnd(process.stdout.columns, '-'));
        logger.error('Process failed  : pid=' + childProcess.pid + `  failed to attach event emitters, ${error}.`);
        logger.log();
        logger.log();
        reject(error);
      }
    });
  }

  public wait(): Promise<number> {
    return this.exitPromise;
  }
}
