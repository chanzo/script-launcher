import * as spawn from 'cross-spawn';
import { ChildProcess, SpawnOptions } from 'child_process';
import { Logger } from './logger';

export class Process {
  public static spawn(command: string, args?: string[], options?: SpawnOptions): Process {
    const process = spawn(command, args, options);

    Logger.log('Spawn process   :', '"' + command + '"', args);
    Logger.info('Process dir     : "' + options.cwd + '"');
    Logger.debug('Process pid     :', process.pid);

    return new Process(process);
  }

  public readonly pid: number;

  private readonly exitPromise: Promise<number>;

  private constructor(childProcess: ChildProcess) {
    this.pid = childProcess.pid;

    this.exitPromise = new Promise<number>((resolve, reject) => {
      try {
        childProcess.on('exit', (code, signal) => {
          Logger.debug('Process exited  : pid=' + childProcess.pid + '  code=' + code + '  signal=' + signal);

          resolve(code);
        });
        childProcess.on('error', (error) => {
          Logger.debug('Process error   : pid=' + childProcess.pid + `  code=${error}`);
          reject(error);
        });
      } catch (error) {
        Logger.error('Process failed  : pid=' + childProcess.pid + `  failed to attach event emitters, ${error}.`);
        reject(error);
      }
    });
  }

  public wait(): Promise<number> {
    return this.exitPromise;
  }
}
