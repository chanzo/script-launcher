import * as spawn from 'cross-spawn';
import { ChildProcess, SpawnOptions } from 'child_process';
import { Logger } from './logger';
import { Colors } from './common';

export class Process {
  public static spawn(command: string, args?: string[], options?: SpawnOptions): Process {
    if (Logger.level > 2 && options) {
      options = { ...options };
      options.stdio = 'pipe';
    }

    const milliseconds = Date.now();
    const process = spawn(command, args, options);

    Logger.log('Spawn process   : ' + Colors.Green + '"' + command + '"' + Colors.Normal, args);
    Logger.log('Process dir     : ' + Colors.Green + '"' + options.cwd + '"' + Colors.Normal);

    if (Logger.level > 2) {
      Logger.debug('Process pid     : ' + Colors.Yellow + process.pid + Colors.Normal);
      Logger.debug(''.padEnd(70, '-'));

      Process.showOutputData(process);
    }

    return new Process(process, milliseconds);
  }

  private static showOutputData(childProcess: ChildProcess): void {
    childProcess.stdout.on('data', (data) => {
      Logger.debug(Colors.Dim + Colors.Italic + (data.toString() as string).trim() + Colors.Normal);
    });
  }

  public readonly pid: number;

  private readonly exitPromise: Promise<number>;

  private constructor(childProcess: ChildProcess, milliseconds: number) {
    this.pid = childProcess.pid;

    this.exitPromise = new Promise<number>((resolve, reject) => {
      try {

        childProcess.on('exit', (code, signal) => {
          const timeSpan = (Date.now() - milliseconds).toFixed(0).replace(/\d(?=(\d{3})+$)/g, '$&,');

          Logger.debug(''.padEnd(70, '-'));
          Logger.debug('Process exited  : pid=' + childProcess.pid + '  code=' + code + '  signal=' + signal, '  timespan=' + timeSpan + ' ms');
          Logger.debug();
          Logger.debug();

          resolve(code);
        });

        childProcess.on('error', (error) => {
          const timeSpan = (Date.now() - milliseconds).toFixed(0).replace(/\d(?=(\d{3})+$)/g, '$&,');

          Logger.debug(''.padEnd(70, '-'));
          Logger.debug('Process error   : pid=' + childProcess.pid + `  code=${error}`, '  timespan=' + timeSpan + ' ms');
          Logger.debug();
          Logger.debug();
          reject(error);
        });
      } catch (error) {
        Logger.debug(''.padEnd(70, '-'));
        Logger.error('Process failed  : pid=' + childProcess.pid + `  failed to attach event emitters, ${error}.`);
        Logger.debug();
        Logger.debug();
        reject(error);
      }
    });
  }

  public wait(): Promise<number> {
    return this.exitPromise;
  }
}
