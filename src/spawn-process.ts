import * as spawn from 'cross-spawn';
import { exec, ChildProcess, ExecOptions, SpawnOptions } from 'child_process';
import { Logger } from './logger';

export class Process {
  public static spawn(command: string, args?: string[], options?: SpawnOptions): Process {
    const process = spawn(command, args, options);

    return new Process(process);
  }

  public static exec(command: string, args?: string[], options?: ExecOptions): Process {
    if (!args) args = [];

    command += ' ' + args.join(' ');

    const process = exec(command, options);

    return new Process(process);
  }

  public readonly pid: number;

  private readonly exitPromise: Promise<number>;

  private constructor(childProcess: ChildProcess) {
    this.pid = childProcess.pid;

    this.exitPromise = new Promise<number>((resolve, reject) => {
      try {
        childProcess.on('exit', (code, signal) => {
          Logger.debug(`Process ${childProcess.pid} exited with code ${code} and signal ${signal}.`);
          resolve(code);
        });
        childProcess.on('error', (error) => {
          Logger.debug(`Process ${childProcess.pid} terminated with an error, ${error}.`);
          reject(error);
        });
      } catch (error) {
        Logger.error(`Process ${childProcess.pid} failed to attach event emitters, ${error}.`);
        reject(error);
      }
    });
  }

  public wait(): Promise<number> {
    return this.exitPromise;
  }
}
