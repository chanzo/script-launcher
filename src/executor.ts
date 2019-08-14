import { IScript, IScriptInfo, IScriptTask, Scripts } from './scripts';
import { ISpawnOptions, Process } from './spawn-process';
import { parseArgsStringToArgv } from 'string-argv';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';
import { getCurrentTime, stringify, Colors } from './common';
import glob = require('glob');
import prettyTime = require('pretty-time');
import { ILaunchSetting } from './config-loader';

interface ITasks {
  condition: string[];
  exclusion: string[];
  'concurrent': Array<ITasks | string>;
  'sequential': Array<ITasks | string>;
  'concurrent-then': Array<ITasks | string>;
  'sequential-then': Array<ITasks | string>;
  'concurrent-else': Array<ITasks | string>;
  'sequential-else': Array<ITasks | string>;
}

enum Order {
  concurrent,
  sequential,
}

interface IProcesses extends Array<Process | Promise<IProcesses>> { }

export class Executor {
  private static readonly assignmentPattern = `^(\\w+\)=([\\w\\,\\.\\-\\@\\#\\%\\^\\*\\:\\;\\+\\/\\\\~\\=\\[\\]\\{\\}\\"\\']+|\".*\"|\'.*\')$`;

  private static convertSingleQuote(command: string): string {
    const argv = parseArgsStringToArgv(command);
    const result: string[] = [];

    for (let value of argv) {
      if (value.includes(' ')) value = '"' + value + '"';

      result.push(value);
    }

    return result.join(' ');
  }

  private static removeEmpties(this: any, key: string, value: any): any {
    if (value instanceof Array && value.length === 0) return undefined;

    return value;
  }

  private static containsConstraint(task: ITasks): boolean {
    return task.condition.length > 0 || task.exclusion.length > 0;
  }

  private static expandArguments(text: string, args: string[]): string {
    for (let index = 0; index < args.length; index++) {
      text = text.replace(new RegExp('([^\\\\]|^)\\$' + index + '\\*', 'g'), '$1' + args.slice(index).join(' '));
      text = text.replace(new RegExp('([^\\\\]|^)\\$\\{' + index + '\\*\\}', 'g'), '$1' + args.slice(index).join(' '));

      text = text.replace(new RegExp('([^\\\\]|^)\\$' + index, 'g'), '$1' + args[index]);
      text = text.replace(new RegExp('([^\\\\]|^)\\$\\{' + index + '\\}', 'g'), '$1' + args[index]);

      if (text.match(/([^\\]|^)\$/) === null) break;
    }

    text = text.replace(/([^\\]|^)\$\*/g, '$1' + args.slice(1).join(' '));
    text = text.replace(/([^\\]|^)\$\{\*\}/g, '$1' + args.slice(1).join(' '));
    text = text.replace(/([^\\]|^)\$\d+\*?/g, '$1');
    text = text.replace(/([^\\]|^)\$\{\d+\*?\}/g, '$1');

    return text;
  }

  private static expandEnvironment(text: string, environment: { [name: string]: string }, remove: boolean = false): string {
    let previousText: string;

    do {
      previousText = text;

      for (const [name, value] of Object.entries(environment)) {
        text = text.replace(new RegExp('([^\\\\]|^)\\$' + name + '([^\\w]|$)', 'g'), '$1' + value + '$2');
        text = text.replace(new RegExp('([^\\\\]|^)\\$\\{' + name + '\\}', 'g'), '$1' + value);

        if (text.match(/([^\\]|^)\$/) === null) break;
      }
    } while (text.match(/([^\\]|^)\$/) !== null && text !== previousText);

    if (!remove) return text;

    text = text.replace(/([^\\]|^)\$\w+/g, '$1');
    text = text.replace(/([^\\]|^)\$\{\w+\}/g, '$1');

    return text;
  }

  private static expandGlobs(pattern: string, options?: glob.IOptions): string {
    const result: string[] = [];

    for (const item of pattern.split(' ')) {
      let value = [item];

      if (item && item.match(/^['|"].*['|"]$/) === null && glob.hasMagic(item, options)) value = glob.sync(item, options);

      result.push(...value);
    }

    return result.join(' ');
  }

  private static getCommandInfo(command: string, options: ISpawnOptions): { command: string, args: string[], options: ISpawnOptions } {
    if (!command) command = '';

    options = { ...options };
    options.env = { ...options.env };

    command = Executor.expandEnvironment(command, options.env, true);

    if (!options.cwd) options.cwd = '';

    let args = [];

    if (!options.shell) {
      args = parseArgsStringToArgv(command);
      command = args[0];
      args.shift();
    }

    if (command === '') {
      console.log();

      return { command: null, args, options };
    }

    if (command === 'echo') {
      if (process.platform === 'win32') command += '.';

      return { command, args, options };
    }

    if (command === '--') {
      console.log(''.padEnd(process.stdout.columns, '-'));

      return { command: null, args, options };
    }

    if (command.startsWith('#')) {
      Logger.log(Colors.Bold + 'Skipping action' + Colors.Normal + ' : ' + Colors.Green + '\'' + command + '\'' + Colors.Normal, args);

      return { command: null, args, options };
    }

    if (command.endsWith(' || true')) {
      command = command.replace(/ \|\| true$/, '');

      options.suppress = true;
    }

    // Test whether the command represents the assignment of an environment variable
    const match = command.trim().match(Executor.assignmentPattern);

    if (match !== null) {
      options.env[match[1]] = match[2];

      Logger.log(Colors.Bold + 'Set environment' + Colors.Normal + ' : ' + Colors.Green + '\'' + match[1] + '=' + match[2] + '\'' + Colors.Normal);

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

  public readonly startTime: [number, number];

  private readonly shell: boolean | string;
  private readonly environment: { [name: string]: string };
  private readonly settings: ILaunchSetting;
  private readonly scripts: Scripts;
  private readonly globOptions: glob.IOptions;

  public constructor(shell: boolean | string, environment: { [name: string]: string }, settings: ILaunchSetting, scripts: Scripts, globOptions: glob.IOptions) {
    this.shell = shell;
    this.environment = environment;
    this.settings = settings;
    this.scripts = scripts;
    this.globOptions = globOptions;
    this.startTime = process.hrtime();
  }

  public async execute(scriptInfo: IScriptInfo): Promise<number> {
    const tasks = this.expand(scriptInfo);
    const options: ISpawnOptions = {
      stdio: 'inherit',
      env: this.environment,
      shell: this.shell,
      suppress: false,
    };

    Logger.info('Script name     :', scriptInfo.name);
    Logger.info('Script params   :', scriptInfo.parameters);
    Logger.info('Script args     :', scriptInfo.arguments);
    Logger.debug('Script object   : ' + stringify(scriptInfo.script));
    Logger.debug('Script expanded : ' + stringify(tasks, Executor.removeEmpties));
    Logger.info();
    Logger.log();

    if (Logger.level > 1) {
      const settings = Object.entries(this.environment).filter(([key, value]) => key.startsWith('launch_setting_'));

      Logger.log(Colors.Bold + 'Launcher Settings Values' + Colors.Normal);
      Logger.log(''.padEnd(process.stdout.columns, '-'));
      for (const [key, value] of settings) {
        Logger.log(Colors.Dim + key + Colors.Normal + '=' + Colors.Green + '\'' + value + '\'' + Colors.Normal);
      }
      Logger.log(''.padEnd(process.stdout.columns, '-'));
      Logger.log('Total: ' + settings.length);
      Logger.log();
      Logger.log();
      Logger.log(Colors.Bold + 'Launcher Settings Arrays' + Colors.Normal);
      Logger.log(''.padEnd(process.stdout.columns, '-'));
      for (const [key, value] of Object.entries(this.settings.arrays)) {
        Logger.log(Colors.Dim + key + Colors.Normal + '=' + stringify(value));
      }
      Logger.log(''.padEnd(process.stdout.columns, '-'));
      Logger.log('Total: ' + settings.length);
      Logger.log();
      Logger.log();
    }

    const processes: IProcesses = [];
    const concurrent: Array<ITasks | string> = [...tasks.concurrent];
    const sequential: Array<ITasks | string> = [...tasks.sequential];

    if (Executor.containsConstraint(tasks)) {
      if (await this.evaluateTask(tasks, options)) {
        concurrent.push(...tasks['concurrent-then']);
        sequential.push(...tasks['sequential-then']);
      } else {
        concurrent.push(...tasks['concurrent-else']);
        sequential.push(...tasks['sequential-else']);
      }
    }

    processes.push(...await this.executeTasks(concurrent, options, Order.concurrent));
    processes.push(...await this.executeTasks(sequential, options, Order.sequential));

    return Executor.wait(processes);
  }

  private preprocessScripts(scripts: IScript[] | string): IScript[] {
    const result: IScript[] = [];

    if (scripts) {
      if (typeof scripts !== 'string') {
        result.push(...scripts);
      } else {
        result.push(scripts);
      }
    }

    return result;
  }

  private expand(scriptInfo: IScriptInfo): ITasks {
    const script = scriptInfo.script;
    const repeater = (script as IScriptTask).repeater;
    const result: ITasks = {
      'condition': [],
      'exclusion': [],
      'concurrent': [],
      'sequential': [],
      'concurrent-then': [],
      'sequential-then': [],
      'concurrent-else': [],
      'sequential-else': [],
    };
    const environment = {
      ...scriptInfo.parameters,
      ...this.settings.values,
    };

    if (!repeater) {
      const concurrent: IScript[] = [];
      const sequential: IScript[] = [];
      const concurrentThen: IScript[] = [];
      const sequentialThen: IScript[] = [];
      const concurrentElse: IScript[] = [];
      const sequentialElse: IScript[] = [];

      if (script instanceof Array) (scriptInfo.inline ? concurrent : sequential).push(...script);
      if (typeof script === 'string') sequential.push(script);

      concurrent.push(...this.preprocessScripts((script as IScriptTask).concurrent));
      sequential.push(...this.preprocessScripts((script as IScriptTask).sequential));
      concurrentThen.push(...this.preprocessScripts((script as IScriptTask)['concurrent-then']));
      sequentialThen.push(...this.preprocessScripts((script as IScriptTask)['sequential-then']));
      concurrentElse.push(...this.preprocessScripts((script as IScriptTask)['concurrent-else']));
      sequentialElse.push(...this.preprocessScripts((script as IScriptTask)['sequential-else']));

      const environment = {
        ...scriptInfo.parameters,
        ...this.settings.values,
      };

      result.condition.push(...this.expandConstraint(scriptInfo.name, (script as IScriptTask).condition, environment, scriptInfo.arguments));
      result.exclusion.push(...this.expandConstraint(scriptInfo.name, (script as IScriptTask).exclusion, environment, scriptInfo.arguments));
      result.concurrent.push(...this.expandTasks(scriptInfo.name, concurrent, environment, scriptInfo.arguments, scriptInfo.parameters));
      result.sequential.push(...this.expandTasks(scriptInfo.name, sequential, environment, scriptInfo.arguments, scriptInfo.parameters));
      result['concurrent-then'].push(...this.expandTasks(scriptInfo.name, concurrentThen, environment, scriptInfo.arguments, scriptInfo.parameters));
      result['sequential-then'].push(...this.expandTasks(scriptInfo.name, sequentialThen, environment, scriptInfo.arguments, scriptInfo.parameters));
      result['concurrent-else'].push(...this.expandTasks(scriptInfo.name, concurrentElse, environment, scriptInfo.arguments, scriptInfo.parameters));
      result['sequential-else'].push(...this.expandTasks(scriptInfo.name, sequentialElse, environment, scriptInfo.arguments, scriptInfo.parameters));
    } else {
      let array = repeater.replace(/^\$/, '');

      array = Executor.expandArguments(array, scriptInfo.arguments);
      array = Executor.expandEnvironment(array, environment);

      const settings = this.settings.arrays[array] || [];
      const repeaterTask: IScriptInfo = {
        name: scriptInfo.name,
        inline: scriptInfo.inline,
        parameters: null,
        arguments: scriptInfo.arguments,
        script: { ...(scriptInfo.script as IScriptTask) },
      };

      (repeaterTask.script as IScriptTask).repeater = null;

      for (const setting of settings) {
        repeaterTask.parameters = { ...scriptInfo.parameters, ...setting };

        const task = this.expand(repeaterTask);

        result.sequential.push({
          'condition': task.condition,
          'exclusion': task.exclusion,
          'concurrent': task.concurrent,
          'sequential': task.sequential,
          'concurrent-then': task['concurrent-then'],
          'sequential-then': task['sequential-then'],
          'concurrent-else': task['concurrent-else'],
          'sequential-else': task['sequential-else'],
        });
      }
    }

    return result;
  }

  private expandConstraint(parent: string, constraints: string | string[], environment: { [name: string]: string }, args: string[]): string[] {
    const result = [];

    if (!constraints) return result;

    if (typeof constraints === 'string') constraints = [constraints];

    if (!(constraints instanceof Array)) throw new Error('Constraint object value not supported: ' + stringify(constraints));

    for (let constraint of constraints) {

      constraint = Executor.expandArguments(constraint, args);
      constraint = Executor.expandEnvironment(constraint, environment);

      const scripts = this.scripts.find(constraint);
      const scriptInfo = Scripts.select(scripts, parent);

      if (scriptInfo) {
        const environment = { ...this.environment, ...scriptInfo.parameters };

        scriptInfo.arguments = [scriptInfo.name, ...scriptInfo.arguments];

        result.push(...this.expandConstraint(constraint, scriptInfo.script as any, environment, args));
      } else {
        result.push(constraint);
      }
    }

    return result;
  }

  private async executeTasks(tasks: Array<ITasks | string>, options: ISpawnOptions, order: Order): Promise<IProcesses> {
    const processes: IProcesses = [];
    const suppress = options.suppress;

    for (const task of tasks) {
      options.suppress = suppress;

      if (typeof task === 'string') {
        options.env.launch_time_current = getCurrentTime();
        options.env.launch_time_elapsed = prettyTime(process.hrtime(this.startTime), 'ms');

        const info = Executor.getCommandInfo(task, options);

        options = info.options;

        if (info.command) {
          let command = Executor.expandGlobs(info.command, {
            ...this.globOptions,
            ...{ cwd: options.cwd },
          });

          // Remove environment and argument escaping
          command = command.replace(/\\\$/g, '$');

          if (process.platform === 'win32') command = Executor.convertSingleQuote(command);

          Logger.log(Colors.Bold + 'Spawn action   ' + Colors.Normal + ' : ' + Colors.Green + '\'' + command + '\'' + Colors.Normal, info.args);
          Logger.log('Spawn options   : { order=' + Colors.Cyan + Order[order] + Colors.Normal + ', supress=' + Colors.Yellow + options.suppress + Colors.Normal + ' }');

          const commandProcess = Process.spawn(command, info.args, options);

          processes.push(commandProcess);

          if (order === Order.sequential && await commandProcess.wait() !== 0) break;
        }
      } else {
        const concurrent: Array<ITasks | string> = [...task.concurrent];
        const sequential: Array<ITasks | string> = [...task.sequential];

        if (Executor.containsConstraint(task)) {
          if (await this.evaluateTask(task, options)) {
            concurrent.push(...task['concurrent-then']);
            sequential.push(...task['sequential-then']);
          } else {
            concurrent.push(...task['concurrent-else']);
            sequential.push(...task['sequential-else']);
          }
        }

        const concurrentProcesses = this.executeTasks(concurrent, options, Order.concurrent);
        const sequentialProcesses = this.executeTasks(sequential, options, Order.sequential);

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

    return processes;
  }

  private async evaluateConstraint(constraint: string, options: ISpawnOptions, outputPattern: string): Promise<boolean> {
    if (outputPattern) Logger.log('Grep pattern    : ' + Colors.Green + '\'' + outputPattern + '\'' + Colors.Normal);

    options = { ...options };

    const evaluateExpression = eval;

    try {
      const result = evaluateExpression(constraint);

      if (typeof result !== 'boolean') throw new Error('type not supported');

      Logger.log('Result          : ' + result);
      Logger.log();
      Logger.log();

      return result;
    } catch (error) {
      // Not a valid javascript expression, continue
    }

    if (fs.existsSync(path.join(path.resolve(options.cwd), constraint))) {
      Logger.log(''.padEnd(process.stdout.columns, '-'));
      Logger.log(Colors.Dim + 'directory exists' + Colors.Normal);
      Logger.log(''.padEnd(process.stdout.columns, '-'));
      Logger.log('Result          : true');
      Logger.log();
      Logger.log();

      return true;
    }

    try {
      options.stdio = ['inherit', 'pipe', 'pipe'];

      if (outputPattern) {
        options.extraLogInfo = (process) => {
          const matches = (process.stdout + process.stderr).match(outputPattern);

          return 'grep=' + (matches === null ? 'failed' : 'success');
        };
      }

      const process = Process.spawn(constraint, [], options);
      const exitCode = await process.wait();

      if (outputPattern) return (process.stdout + process.stderr).match(outputPattern) != null;

      return exitCode === 0;
    } catch {
      return false;
    }
  }

  private async evaluateTask(task: ITasks, options: ISpawnOptions): Promise<boolean> {
    let condition = true;
    let exclusion = false;

    options = { ...options };

    if (!options.cwd) options.cwd = '';

    for (let constraint of task.condition) {
      constraint = Executor.expandEnvironment(constraint, options.env, true);
      // Test whether the command represents the assignment of an environment variable
      const assignmentMatchs = constraint.trim().match(Executor.assignmentPattern);

      if (assignmentMatchs === null) {
        const outputMatches = constraint.match(/(.*)\|\?(.*)/);
        let outputPattern: string = null;

        if (outputMatches !== null) {
          constraint = outputMatches[1].trim();
          outputPattern = Executor.expandEnvironment(outputMatches[2].trim(), options.env, true);
        }

        constraint = Executor.expandGlobs(constraint, {
          ...this.globOptions,
          ...{ cwd: options.cwd },
        });

        // Remove environment and argument escaping
        constraint = constraint.replace(/\\\$/g, '$');

        Logger.log(Colors.Bold + 'Condition       : ' + Colors.Normal + Colors.Green + '\'' + constraint + '\'' + Colors.Normal);

        if (!await this.evaluateConstraint(constraint, options, outputPattern)) {
          condition = false;
          break;
        }
      } else {
        options.env[assignmentMatchs[1]] = assignmentMatchs[2];

        Logger.log(Colors.Bold + 'Set environment' + Colors.Normal + ' : ' + Colors.Green + '\'' + assignmentMatchs[1] + '=' + assignmentMatchs[2] + '\'' + Colors.Normal);
      }
    }

    for (let constraint of task.exclusion) {
      constraint = Executor.expandEnvironment(constraint, options.env, true);
      // Test whether the command represents the assignment of an environment variable
      const assignmentMatchs = constraint.trim().match(Executor.assignmentPattern);

      if (assignmentMatchs === null) {
        const outputMatches = constraint.match(/(.*)\|\?(.*)/);
        let outputPattern: string = null;

        if (outputMatches !== null) {
          constraint = outputMatches[1].trim();
          outputPattern = Executor.expandEnvironment(outputMatches[2].trim(), options.env, true);
        }

        constraint = Executor.expandGlobs(constraint, {
          ...this.globOptions,
          ...{ cwd: options.cwd },
        });

        Logger.log(Colors.Bold + 'Exclusion       : ' + Colors.Normal + Colors.Green + '\'' + constraint + '\'' + Colors.Normal);

        if (await this.evaluateConstraint(constraint, options, outputPattern)) {
          exclusion = true;
          break;
        }
      } else {
        options.env[assignmentMatchs[1]] = assignmentMatchs[2];

        Logger.log(Colors.Bold + 'Set environment' + Colors.Normal + ' : ' + Colors.Green + '\'' + assignmentMatchs[1] + '=' + assignmentMatchs[2] + '\'' + Colors.Normal);
      }
    }

    return condition && !exclusion;
  }

  private expandTasks(parent: string, tasks: IScript[], environment: { [name: string]: string }, args: string[], parameters: { [name: string]: string }): Array<ITasks | string> {
    const result: Array<ITasks | string> = [];

    for (let task of tasks) {
      if (typeof task === 'string') {
        task = Executor.expandArguments(task, args);
        task = Executor.expandEnvironment(task, environment);

        const scripts = this.scripts.find(task);
        const scriptInfo = Scripts.select(scripts, parent);

        if (scriptInfo) {
          scriptInfo.arguments = [scriptInfo.name, ...scriptInfo.arguments];

          result.push(this.expand(scriptInfo));
        } else {
          result.push(task);
        }
      } else {
        const scriptInfo: IScriptInfo = {
          name: 'inline-script-block',
          inline: true,
          parameters: parameters,
          arguments: args,
          script: task,
        };

        if ((task as IScriptTask).repeater) {
          result.push(...this.expand(scriptInfo).sequential);
        } else {
          result.push(this.expand(scriptInfo));
        }
      }
    }

    return result;
  }
}
