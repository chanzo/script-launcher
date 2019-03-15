import { IScriptInfo, IScriptTask, Scripts } from './scripts';
import { SpawnOptions } from 'child_process';
import { Process } from './spawn-process';
import * as stringArgv from 'string-argv';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';
import { stringify, Colors } from './common';

interface ICommands {
  concurrent: Array<ICommands | string>;
  sequential: Array<ICommands | string>;
}

enum Order {
  concurrent,
  sequential,
}

export class Executor {
  private static expandArguments(text: string, args: string[]): string {
    for (let index = 0; index < args.length; index++) {
      const regexp = new RegExp('\\$' + index, 'g');

      text = text.replace(regexp, args[index]);

      if (!text.includes('$')) break;
    }

    return text;
  }

  private static expandEnvironment(text: string, environment: { [name: string]: string }): string {
    for (const [name, value] of Object.entries(environment)) {
      const regexp = new RegExp('\\$' + name + '([^\\w]|$)', 'g');

      text = text.replace(regexp, value + '$1');

      if (!text.includes('$')) break;
    }

    return text.replace(/\$\w+/g, '');
  }

  private static getCommandParams(command: string, options: SpawnOptions): { command: string, args: string[], options: SpawnOptions } {
    options = { ...options };

    if (!options.cwd) options.cwd = '';

    let args = [];

    if (!options.shell) {
      args = stringArgv(command);
      command = args[0];
      args.shift();
    }

    const fullPath = path.join(path.resolve(options.cwd), command);

    if (fs.existsSync(fullPath)) {
      options.cwd = fullPath;
      command = null;
    }

    return { command, args, options };
  }

  private readonly shell: boolean | string;
  private readonly args: string[];
  private readonly environment: { [name: string]: string };
  private readonly scripts: Scripts;

  public constructor(shell: boolean | string, args: string[], environment: { [name: string]: string }, scripts: Scripts) {
    this.shell = shell;
    this.args = args;
    this.environment = environment;
    this.scripts = scripts;
  }

  public async execute(script: IScriptInfo): Promise<number> {
    const commands = this.expand(script);

    Logger.info('Script name     :', script.name);
    Logger.info('Script params   :', script.parameters);
    Logger.debug('Script object   : ' + stringify(script.script));
    Logger.debug('Script expanded : ' + stringify(commands));

    const processes = await this.executeCommands(commands);

    let exitCode = 0;

    for (const promis of processes) {
      for (const process of await promis) {
        exitCode += await process.wait();
      }
    }

    return exitCode;
  }

  private expand(script: IScriptInfo): ICommands {
    const concurrent: string[] = [];
    const sequential: string[] = [];
    const command = script.script;

    if (command instanceof Array) sequential.push(...command);
    if (typeof command === 'string') sequential.push(command);
    if (command instanceof String) sequential.push(command.toString());

    if ((command as IScriptTask).concurrent) concurrent.push(...(command as IScriptTask).concurrent);
    if ((command as IScriptTask).sequential) sequential.push(...(command as IScriptTask).sequential);

    const environment = { ...this.environment, ...script.parameters };

    return this.expandTasks(concurrent, sequential, environment);
  }

  private resolveSequential(items: Array<ICommands | string>): string[] {
    const result: string[] = [];

    for (const item of items) {
      if (typeof item === 'string') {
        result.push(item);
      } else {
        result.push(...this.resolveSequential(item.sequential));
      }
    }

    return result;
  }

  private resolveConcurrent(items: Array<ICommands | string>): string[] {
    const result: string[] = [];

    for (const item of items) {
      if (typeof item === 'string') {
        result.push(item);
      } else {
        result.push(...this.resolveConcurrent(item.concurrent));
      }
    }

    return result;
  }

  private resolveNoStringSequential(items: Array<ICommands | string>): string[] {
    const result: string[] = [];

    for (const item of items) {
      if (typeof item !== 'string') {
        result.push(...this.resolveSequential(item.sequential));
      }
    }

    return result;
  }

  private resolveNoStringConcurrent(items: Array<ICommands | string>): string[] {
    const result: string[] = [];

    for (const item of items) {
      if (typeof item !== 'string') {
        result.push(...this.resolveConcurrent(item.concurrent));
      }
    }

    return result;
  }

  private executeCommands(command: ICommands): Array<Promise<Process[]>> {
    const processes: Array<Promise<Process[]>> = [];

    const sequential = this.resolveSequential(command.sequential);
    const concurrent = this.resolveConcurrent(command.concurrent);

    Logger.debug('sequential: ' + stringify(sequential));
    Logger.debug('concurrent: ' + stringify(concurrent));

    processes.push(this.executeCommand(sequential, Order.sequential));
    processes.push(this.executeCommand(concurrent, Order.concurrent));

    command = {
      sequential: this.resolveNoStringSequential(command.concurrent),
      concurrent: this.resolveNoStringConcurrent(command.sequential),
    };
    if (command.concurrent.length > 0 || command.sequential.length) {
      processes.push(...this.executeCommands(command));
    }

    // processes.push(this.executeCommand(command.concurrent.filter((command) => typeof command === 'string') as string[], Order.concurrent));
    // processes.push(this.executeCommand(command.sequential.filter((command) => typeof command === 'string') as string[], Order.sequential));

    // processes.push(...this.executeCommands(command.concurrent.filter((command) => typeof command !== 'string') as ICommands[]));
    // processes.push(...this.executeCommands(command.sequential.filter((command) => typeof command !== 'string') as ICommands[]));

    return processes;
  }

  private async executeCommand(commands: string[], order: Order): Promise<Process[]> {
    let options: SpawnOptions = {
      stdio: 'inherit',
      env: this.environment,
      shell: this.shell,
    };

    const processes: Process[] = [];

    for (const command of commands) {
      const params = Executor.getCommandParams(command, options);

      options = params.options;

      if (params.command) {
        Logger.log('Spawn order     : ' + Colors.Cyan + Order[order] + Colors.Normal);

        const process = Process.spawn(params.command, params.args, params.options);

        processes.push(process);

        if (order === Order.sequential && await process.wait() !== 0) break;
      }
    }

    return processes;
  }

  private expandReferences(concurrent: string[], sequential: string[], scripts: Scripts): ICommands {
    const result: ICommands = {
      concurrent: [],
      sequential: [],
    };

    for (const command of concurrent) {
      const script = scripts.find(command);

      if (script) {
        const commands = this.expand(script);

        result.concurrent.push({
          sequential: commands.sequential,
          concurrent: commands.concurrent,
        });
      } else {
        result.concurrent.push(command);
      }
    }

    for (const command of sequential) {
      const script = scripts.find(command);

      if (script) {
        const commands = this.expand(script);

        result.sequential.push({
          sequential: commands.sequential,
          concurrent: commands.concurrent,
        });
      } else {
        result.sequential.push(command);
      }
    }

    return result;
  }

  private expandTasks(concurrent: string[], sequential: string[], environment: { [name: string]: string }): ICommands {
    concurrent = [...concurrent];
    sequential = [...sequential];

    for (let index = 0; index < concurrent.length; index++) {
      const command = Executor.expandArguments(concurrent[index], this.args);

      concurrent[index] = Executor.expandEnvironment(command, environment);
    }

    for (let index = 0; index < sequential.length; index++) {
      const command = Executor.expandArguments(sequential[index], this.args);

      sequential[index] = Executor.expandEnvironment(command, environment);
    }

    return this.expandReferences(concurrent, sequential, this.scripts);
  }
}
