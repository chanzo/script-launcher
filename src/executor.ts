import { IScript, IScriptInfo, IScriptTask, Scripts } from './scripts';
import { SpawnOptions } from 'child_process';
import { Process } from './spawn-process';
import * as stringArgv from 'string-argv';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';
import { getCurrentTime, stringify, Colors } from './common';

interface ITasks {
  condition: string;
  exclusion: string;
  concurrent: Array<ITasks | string>;
  sequential: Array<ITasks | string>;
}

enum Order {
  concurrent,
  sequential,
}

interface IProcesses extends Array<Process | Promise<IProcesses>> { }

export class Executor {
  private static expandArguments(text: string, args: string[]): string {
    for (let index = 0; index < args.length; index++) {
      const regexp = new RegExp('\\$' + index, 'g');

      text = text.replace(regexp, args[index]);

      if (!text.includes('$')) break;
    }

    return text.replace(/\$\*/g, args.slice(1).join(' '));
  }

  private static expandEnvironment(text: string, environment: { [name: string]: string }, remove: boolean = false): string {
    for (const [name, value] of Object.entries(environment)) {
      const regexp = new RegExp('\\$' + name + '([^\\w]|$)', 'g');

      text = text.replace(regexp, value + '$1');

      if (!text.includes('$')) break;
    }

    if (!remove) return text;

    return text.replace(/\$\w+/g, '');
  }

  private static getCommandInfo(command: string, options: SpawnOptions): { command: string, args: string[], options: SpawnOptions } {
    if (!command) command = '';

    options = { ...options };

    if (!options.cwd) options.cwd = '';

    let args = [];

    if (!options.shell) {
      args = stringArgv(command);
      command = args[0];
      args.shift();
    }

    if (command === 'echo') {
      if (process.platform === 'win32') command += '.';

      return { command, args, options };
    }

    // Test whether the command represents the assignment of an environment variable
    const match = command.trim().match(`^(\\w+\)=([\\w\\,\\.\\-\\@\\#\\%\\^\\*\\:\\;\\+\\/\\\~\\=\\[\\]\\{\\}]+|\".*\"|\'.*\')$`);

    if (match !== null) {
      options.env[match[1]] = match[2];

      return { command: null, args, options };
    }

    const fullPath = path.join(path.resolve(options.cwd), command);

    if (fs.existsSync(fullPath)) {
      options.cwd = fullPath;

      return { command: null, args, options };
    }

    return { command, args, options };
  }

  private static async wait(processes: IProcesses): Promise<number> {
    let exitCode = 0;

    for (const item of processes) {
      if (item instanceof Promise) {
        exitCode += await this.wait(await item);
      } else {
        exitCode += await item.wait();
      }
    }

    return exitCode;
  }

  private readonly shell: boolean | string;
  private readonly environment: { [name: string]: string };
  private readonly scripts: Scripts;
  private readonly logger: Logger;

  public constructor(shell: boolean | string, environment: { [name: string]: string }, scripts: Scripts, logLevel: number) {
    this.shell = shell;
    this.environment = environment;
    this.scripts = scripts;
    this.logger = new Logger(logLevel);
  }

  public async execute(scriptInfo: IScriptInfo): Promise<number> {
    const tasks = this.expand(scriptInfo);
    const options: SpawnOptions = {
      stdio: 'inherit',
      env: this.environment,
      shell: this.shell,
    };

    this.logger.info('Script name     :', scriptInfo.name);
    this.logger.info('Script params   :', scriptInfo.parameters);
    this.logger.info('Script args     :', scriptInfo.arguments);
    this.logger.debug('Script object   : ' + stringify(scriptInfo.script));
    this.logger.debug('Script expanded : ' + stringify(tasks));
    this.logger.info();

    const processes: IProcesses = [];

    processes.push(...await this.executeTasks(tasks.concurrent, options, Order.concurrent));
    processes.push(...await this.executeTasks(tasks.sequential, options, Order.sequential));

    return Executor.wait(processes);
  }

  private expand(scriptInfo: IScriptInfo): ITasks {
    const concurrent: IScript[] = [];
    const sequential: IScript[] = [];
    const script = scriptInfo.script;

    if (script instanceof Array) (scriptInfo.inline ? concurrent : sequential).push(...script);
    if (typeof script === 'string') sequential.push(script);
    if (script instanceof String) sequential.push(script.toString());

    if ((script as IScriptTask).concurrent) concurrent.push(...(script as IScriptTask).concurrent);
    if ((script as IScriptTask).sequential) sequential.push(...(script as IScriptTask).sequential);

    const environment = { ...this.environment, ...scriptInfo.parameters };

    return {
      condition: (script as IScriptTask).condition,
      exclusion: (script as IScriptTask).exclusion,
      concurrent: this.expandTasks(scriptInfo.name, concurrent, environment, scriptInfo.arguments),
      sequential: this.expandTasks(scriptInfo.name, sequential, environment, scriptInfo.arguments),
    };
  }

  private async executeTasks(tasks: Array<ITasks | string>, options: SpawnOptions, order: Order): Promise<IProcesses> {
    const processes: IProcesses = [];
    const milliseconds = (new Date(options.env.LAUNCH_START)).getTime();

    for (const task of tasks) {

      if (typeof task === 'string') {
        const info = Executor.getCommandInfo(task, options);

        options = info.options;

        if (info.command) {
          options.env.LAUNCH_CURRENT = getCurrentTime();
          options.env.LAUNCH_ELAPSED = (Date.now() - milliseconds).toFixed(0).replace(/\d(?=(\d{3})+$)/g, '$&,') + ' ms';

          const command = Executor.expandEnvironment(info.command, options.env, true);

          this.logger.log(Colors.Bold + 'Spawn process   : ' + Colors.Normal + Colors.Green + '"' + command + '"' + Colors.Normal, info.args);
          this.logger.log('Spawn order     : ' + Colors.Cyan + Order[order] + Colors.Normal);

          const process = Process.spawn(command, info.args, options, this.logger);

          processes.push(process);

          if (order === Order.sequential && await process.wait() !== 0) break;
        }
      } else {
        if (await this.evaluateTask(task, options)) {
          const concurrentProcesses = this.executeTasks(task.concurrent, options, Order.concurrent);
          const sequentialProcesses = this.executeTasks(task.sequential, options, Order.sequential);

          processes.push(concurrentProcesses);
          processes.push(sequentialProcesses);

          if (order === Order.sequential) {
            let exitCode = 0;

            exitCode += await Executor.wait(await concurrentProcesses);
            exitCode += await Executor.wait(await sequentialProcesses);

            if (exitCode > 0) break;
          }
        }
      }
    }

    return processes;
  }

  private async evaluateConstraint(constraint: string, options): Promise<boolean> {
    if (fs.existsSync(path.join(path.resolve(options.cwd), constraint))) {
      this.logger.log(''.padEnd(process.stdout.columns, '-'));
      this.logger.log(Colors.Dim + Colors.Italic + 'directory exists' + Colors.Normal);
      this.logger.log(''.padEnd(process.stdout.columns, '-'));
      this.logger.log('Result          : code=true');
      this.logger.log();
      this.logger.log();

      return true;
    }

    return await Process.spawn(constraint, [], options, this.logger).wait() === 0;
  }

  private async evaluateTask(task: ITasks, options: SpawnOptions): Promise<boolean> {
    let condition = true;
    let exclusion = false;

    if (task.condition) {
      this.logger.log(Colors.Bold + 'Condition       : ' + Colors.Normal + Colors.Green + '"' + task.condition + '"' + Colors.Normal);

      condition = await this.evaluateConstraint(task.condition, options);
    }

    if (task.exclusion) {
      this.logger.log(Colors.Bold + 'Exclusion       : ' + Colors.Normal + Colors.Green + '"' + task.exclusion + '"' + Colors.Normal);

      exclusion = await this.evaluateConstraint(task.exclusion, options);
    }

    return condition && !exclusion;
  }

  private expandTasks(parent: string, tasks: IScript[], environment: { [name: string]: string }, args: string[]): Array<ITasks | string> {
    const result: Array<ITasks | string> = [];

    for (let task of tasks) {
      if (typeof task === 'string') {
        task = Executor.expandArguments(task, args);
        task = Executor.expandEnvironment(task, environment);

        const scripts = this.scripts.find(task);
        const script = Scripts.select(scripts, parent);

        if (script) {
          script.arguments = [script.name, ...script.arguments];

          result.push(this.expand(script));
        } else {
          result.push(task);
        }
      } else {
        const script: IScriptInfo = {
          name: 'inline-script-block',
          inline: true,
          parameters: {},
          arguments: [],
          script: task,
        };

        script.arguments = [script.name, ...script.arguments];

        result.push(this.expand(script));
      }
    }

    return result;
  }
}
