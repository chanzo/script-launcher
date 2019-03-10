import { ICommand, IScript } from './config-loader';
import { Scripts } from './scripts';
import { SpawnOptions } from 'child_process';
import { Process } from './spawn-process';
import * as stringArgv from 'string-argv';
import { Logger } from './logger';
import * as Fs from 'fs';
import * as Path from 'path';

type ISpawnHandler = (command: string, args: string[], options: SpawnOptions) => Promise<Process>;

export class Command {
  private static expandArguments(text: string, args: string[]): string {
    for (let index = 0; index < args.length; index++) {
      const regexp = new RegExp('\\$' + index, 'g');

      text = text.replace(regexp, args[index]);

      if (!text.includes('$')) break;
    }

    return text;
  }

  private static expandEnvironment(text: string, environment: { [name: string]: string }): string {
    for (const [key, value] of Object.entries(environment)) {
      const regexp = new RegExp('\\$' + key + '([^\\w]|$)', 'g');

      text = text.replace(regexp, value + '$1');

      if (!text.includes('$')) break;
    }

    return text.replace(/\$\w+/g, '');
  }

  private static async spawnConcurrent(commands: string[], options: SpawnOptions): Promise<Process[]> {
    const processes: Process[] = [];

    options = { ...options };

    for (const command of commands) {
      const process = await Command.executeCommand(command, options);

      if (process) {
        Logger.log('Concurrent process pid:' + process.pid);

        processes.push(process);
      }
    }

    return processes;
  }

  private static async spawnSequential(commands: string[], options: SpawnOptions): Promise<Process[]> {
    const processes: Process[] = [];

    options = { ...options };

    for (const command of commands) {
      const process = await Command.executeCommand(command, options);

      if (process) {
        Logger.log('Sequential process pid:' + process.pid);

        const code = await process.wait();

        processes.push(process);

        if (code !== 0) break;
      }
    }

    return processes;
  }

  private static async executeCommand(command: string, options: SpawnOptions): Promise<Process> {
    if (!options.cwd) options.cwd = '';

    let args = [];

    if (!options.shell) {
      args = stringArgv(command);
      command = args[0];
      args.shift();
    }

    const path = Path.join(Path.resolve(options.cwd), command);

    if (Fs.existsSync(path)) {
      options.cwd = path;
      return null;
    }

    Logger.info('Spawn directory: ', options.cwd);

    const process = Process.spawn(command, args, options);

    Logger.log('Spawn Process: ' + '\'' + command + '\'' + args);

    return process;
  }

  private readonly scripts: Scripts;
  private readonly args: string[];
  private readonly environment: { [name: string]: string };

  public constructor(args: string[], environment: { [name: string]: string }, scripts: Scripts) {
    this.scripts = scripts;
    this.args = args;
    this.environment = environment;
  }

  public async execute(commands: ICommand, shell: boolean | string): Promise<number> {
    const options: SpawnOptions = {
      stdio: 'inherit',
      env: this.environment,
      shell: shell,
    };

    if (commands.concurrent.length === 0 && commands.sequential.length === 0) throw new Error('missing script');

    const processes: Process[] = [];

    processes.push(...await Command.spawnConcurrent(commands.concurrent, options));
    processes.push(...await Command.spawnSequential(commands.sequential, options));

    let exitCode = 0;

    for (const process of processes) {
      exitCode += await process.wait();
    }

    return exitCode;
  }

  public prepare(script: IScript): ICommand {
    const concurrent: string[] = [];
    const sequential: string[] = [];
    const command = script.command;

    if (command instanceof Array) sequential.push(...command);
    if (typeof command === 'string') sequential.push(command);
    if (command instanceof String) sequential.push(command.toString());

    if ((command as ICommand).concurrent) concurrent.push(...(command as ICommand).concurrent);
    if ((command as ICommand).sequential) sequential.push(...(command as ICommand).sequential);

    const environment = { ...this.environment, ...script.parameters };

    return this.resolveReferences(concurrent, sequential, environment);
  }

  private expandReferences(concurrent: string[], sequential: string[], scripts: Scripts): ICommand {
    const result: ICommand = {
      concurrent: [],
      sequential: [],
    };

    for (const command of concurrent) {
      const script = scripts.find(command);

      if (script) {
        const commands = this.prepare(script);

        result.sequential.push(...commands.sequential);
        result.concurrent.push(...commands.concurrent);
      } else {
        result.concurrent.push(command);
      }
    }

    for (const command of sequential) {
      const script = scripts.find(command);

      if (script) {
        const commands = this.prepare(script);

        result.sequential.push(...commands.sequential);
        result.concurrent.push(...commands.concurrent);
      } else {
        result.sequential.push(command);
      }
    }

    return result;
  }

  private resolveReferences(concurrent: string[], sequential: string[], environment: { [name: string]: string }): ICommand {
    concurrent = [...concurrent];
    sequential = [...sequential];

    for (let index = 0; index < concurrent.length; index++) {
      const command = Command.expandArguments(concurrent[index], this.args);

      concurrent[index] = Command.expandEnvironment(command, environment);
    }

    for (let index = 0; index < sequential.length; index++) {
      const command = Command.expandArguments(sequential[index], this.args);

      sequential[index] = Command.expandEnvironment(command, environment);
    }

    return this.expandReferences(concurrent, sequential, this.scripts);
  }
}
