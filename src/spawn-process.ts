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

    const process = spawn(command, args, options);

    if (Logger.level > 2) {
      Logger.log('Spawn process   : ' + Colors.Green + '"' + command + '"' + Colors.Normal, args);
      Logger.info('Process dir     : ' + Colors.Green + '"' + options.cwd + '"' + Colors.Normal);
      Logger.debug('Process pid     : ' + Colors.Yellow + process.pid + Colors.Normal);
      Logger.debug(''.padEnd(64, '-'));

      Process.showOutputData(process);
    }

    return new Process(process);
  }

  private static showOutputData(childProcess: ChildProcess): void {
    childProcess.stdout.on('data', (data) => {
      Logger.debug(Colors.Dim + Colors.Italic + (data.toString() as string).trim() + Colors.Normal);
    });
  }

  public readonly pid: number;

  private readonly exitPromise: Promise<number>;

  private constructor(childProcess: ChildProcess) {
    this.pid = childProcess.pid;

    this.exitPromise = new Promise<number>((resolve, reject) => {
      try {

        childProcess.on('exit', (code, signal) => {
          Logger.debug(''.padEnd(64, '-'));
          Logger.debug('Process exited  : pid=' + childProcess.pid + '  code=' + code + '  signal=' + signal);
          Logger.debug();
          Logger.debug();

          resolve(code);
        });

        childProcess.on('error', (error) => {
          Logger.debug(''.padEnd(64, '-'));
          Logger.debug('Process error   : pid=' + childProcess.pid + `  code=${error}`);
          Logger.debug();
          Logger.debug();
          reject(error);
        });
      } catch (error) {
        Logger.debug(''.padEnd(64, '-'));
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
