import { IScriptInfo, IScriptTask, Scripts } from './scripts';
import { SpawnOptions } from 'child_process';
import { Process } from './spawn-process';
import * as stringArgv from 'string-argv';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';
import { stringify, Colors } from './common';

interface ITasks {
  concurrent: Array<ITasks | string>;
  sequential: Array<ITasks | string>;
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

  public async execute(scriptInfo: IScriptInfo): Promise<number> {
    const tasks = this.expand(scriptInfo);

    Logger.info('Script name     :', scriptInfo.name);
    Logger.info('Script params   :', scriptInfo.parameters);
    Logger.log('Script object   : ' + stringify(scriptInfo.script));
    Logger.log('Script expanded : ' + stringify(tasks));

    const processes = await this.executeTasksRoot(tasks);

    let exitCode = 0;

    for (const promis of processes) {
      for (const process of await promis) {
        exitCode += await process.wait();
      }
    }

    return exitCode;
  }

  private expand(scriptInfo: IScriptInfo): ITasks { // 286
    const concurrent: string[] = [];
    const sequential: string[] = [];
    const script = scriptInfo.script;

    if (script instanceof Array) sequential.push(...script);
    if (typeof script === 'string') sequential.push(script);
    if (script instanceof String) sequential.push(script.toString());

    if ((script as IScriptTask).concurrent) concurrent.push(...(script as IScriptTask).concurrent);
    if ((script as IScriptTask).sequential) sequential.push(...(script as IScriptTask).sequential);

    const environment = { ...this.environment, ...scriptInfo.parameters };

    return {
      concurrent: this.expandTasks(concurrent, environment),
      sequential: this.expandTasks(sequential, environment),
    };
  }

  private executeTasksRoot(tasks: ITasks): Array<Promise<Process[]>> {
    const processes: Array<Promise<Process[]>> = [];

    processes.push(this.executeTasks(tasks.concurrent, Order.concurrent));
    processes.push(this.executeTasks(tasks.sequential, Order.sequential));

    return processes;
  }

  private async executeTasks(tasks: Array<ITasks | string>, order: Order): Promise<Process[]> {
    let options: SpawnOptions = {
      stdio: 'inherit',
      env: this.environment,
      shell: this.shell,
    };

    const processes: Process[] = [];

    for (const task of tasks) {

      if (typeof task === 'string') {
        const params = Executor.getCommandParams(task, options);

        options = params.options;

        if (params.command) {
          Logger.log('Spawn order     : ' + Colors.Cyan + Order[order] + Colors.Normal);

          const process = Process.spawn(params.command, params.args, params.options);

          processes.push(process);

          if (order === Order.sequential && await process.wait() !== 0) break;
        }
      } else {
        console.log('********************');
        // processes.push(...await this.executeTasks(task.concurrent, Order.concurrent));
        // processes.push(...await this.executeTasks(task.sequential, Order.sequential));
        this.executeTasks(task.concurrent, Order.concurrent);
        this.executeTasks(task.sequential, Order.sequential);
      }
    }

    return processes;
  }

  private expandTasks(tasks: string[], environment: { [name: string]: string }): Array<ITasks | string> {
    const result: Array<ITasks | string> = [];

    for (let task of tasks) {

      task = Executor.expandArguments(task, this.args);
      task = Executor.expandEnvironment(task, environment);

      const script = this.scripts.find(task);

      if (script) {
        result.push(this.expand(script));
      } else {
        result.push(task);
      }
    }

    return result;
  }
}
