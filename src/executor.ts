import { IScript, IScriptInfo, IScriptTask, Scripts } from './scripts';
import { IProcess, ISpawnOptions, Process } from './spawn-process';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';
import { confirmPrompt, formatTime, stringify, stringToArgv, Colors, Limiter } from './common';
import glob = require('fast-glob');
import prettyTime = require('pretty-time');
import { ILaunchSetting } from './config-loader';

interface ITasks {
  circular: boolean;
  parameters: { [name: string]: string }; // Used for debugging only
  confirm: string[];
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
  sequential
}

interface IProcesses extends Array<IProcess | Promise<IProcesses>> {}

export class Executor {
  private static readonly assignmentPattern = `^(\\w+\)=([\\$\\w\\,\\.\\-\\@\\#\\%\\^\\*\\:\\;\\+\\/\\\\~\\=\\[\\]\\{\\}\\"\\']+|\".*\"|\'.*\')$`;

  public readonly startTime: [number, number];

  private readonly shell: boolean | string;
  private readonly environment: { [name: string]: string };
  private readonly settings: ILaunchSetting;
  private readonly scripts: Scripts;
  private readonly globOptions: glob.Options;
  private readonly confirm?: boolean;
  private readonly testmode: boolean;
  private readonly limit: number;

  public constructor(
    shell: boolean | string,
    environment: { [name: string]: string },
    settings: ILaunchSetting,
    scripts: Scripts,
    globOptions: glob.Options,
    confirm: boolean | undefined,
    limit: number,
    testmode: boolean
  ) {
    this.shell = shell;
    this.environment = environment;
    this.settings = settings;
    this.scripts = scripts;
    this.globOptions = globOptions;
    this.confirm = confirm;
    this.testmode = testmode;
    this.startTime = process.hrtime();
    this.limit = limit;
  }

  public async execute(scriptInfo: IScriptInfo): Promise<number> {
    const tasks = this.expand(scriptInfo);
    const options: ISpawnOptions = {
      stdio: 'inherit',
      env: this.environment,
      shell: this.shell,
      suppress: false,
      testmode: this.testmode,
      limit: this.limit
    };

    if (Logger.level > 0) {
      Logger.info('Script id       :', scriptInfo.name);
      Logger.info('Circular        :', Executor.isCircular([tasks]));
      Logger.info('Script params   :', scriptInfo.parameters);
      Logger.info('Script args     :', scriptInfo.arguments);
      Logger.debug('Script object   : ' + stringify(scriptInfo.script));
      Logger.debug('Script expanded : ' + stringify(tasks, Executor.removeEmpties));
      Logger.info();
      Logger.log();
    }

    if (Logger.level > 1) {
      const settings = Object.entries(this.environment).filter(([key, value]) => key.startsWith('launch_setting_'));

      Logger.log(Colors.Bold + 'Launcher Settings Values' + Colors.Normal);
      Logger.log(''.padEnd(process.stdout.columns, '-'));
      for (const [key, value] of settings) {
        Logger.log(Colors.Dim + key + Colors.Normal + '=' + Colors.Green + "'" + value + "'" + Colors.Normal);
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
      try {
        if (await this.evaluateTask(tasks, options)) {
          concurrent.push(...tasks['concurrent-then']);
          sequential.push(...tasks['sequential-then']);
        } else {
          concurrent.push(...tasks['concurrent-else']);
          sequential.push(...tasks['sequential-else']);
        }
      } catch {
        return 0;
      }
    }

    processes.push(...(await this.executeTasks(concurrent, options, Order.concurrent)));
    processes.push(...(await this.executeTasks(sequential, options, Order.sequential)));

    return Executor.wait(processes);
  }

  private static isEmptyTask(tasks: ITasks): boolean {
    if (tasks.confirm.length > 0) return false;
    if (tasks.condition.length > 0) return false;
    if (tasks.exclusion.length > 0) return false;
    if (tasks.concurrent.length > 0) return false;
    if (tasks.sequential.length > 0) return false;
    if (tasks['concurrent-then'].length > 0) return false;
    if (tasks['sequential-then'].length > 0) return false;
    if (tasks['concurrent-else'].length > 0) return false;
    if (tasks['sequential-else'].length > 0) return false;

    return true;
  }

  private static convertSingleQuote(command: string): string {
    const argv = stringToArgv(command);
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
    return task.condition.length > 0 || task.exclusion.length > 0 || task.confirm.length > 0;
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

  private static expandEnvironment(text: string, environment: { [name: string]: string }): string {
    let previousText: string;

    do {
      previousText = text;

      for (const [name, value] of Object.entries(environment)) {
        text = text.replace(new RegExp('([^\\\\]|^)\\$' + name + '([^\\w]|$)', 'g'), '$1' + value + '$2');
        text = text.replace(new RegExp('([^\\\\]|^)\\$\\{' + name + '\\}', 'g'), '$1' + value);

        if (text.match(/([^\\]|^)\$/) === null) break;
      }
    } while (text.match(/([^\\]|^)\$/) !== null && text !== previousText);

    return text;
  }

  private static removeEnvironment(text: string): string {
    text = text.replace(/([^\\]|^)\$\w+/g, '$1');
    text = text.replace(/([^\\]|^)\$\{\w+\}/g, '$1');

    return text;
  }

  private static extendEnvironment(environment: { [name: string]: string }, command: string): boolean {
    const match = command.trim().match(Executor.assignmentPattern);

    if (match !== null) {
      if (match[2].startsWith('$')) {
        const environmentValue = match[2].replace('$', '');
        const settings = Object.entries(environment).filter(([key]) => key.startsWith(environmentValue + '_'));

        for (const [key, value] of settings) {
          if (key.startsWith(environmentValue)) {
            const environmentKey = match[1] + key.replace(environmentValue, '');

            environment[environmentKey] = value;

            Logger.debug(Colors.Bold + 'Set environment' + Colors.Normal + ' : ' + Colors.Green + "'" + environmentKey + '=' + value + "'" + Colors.Normal);
          }
        }
      } else {
        environment[match[1]] = match[2];

        Logger.debug(Colors.Bold + 'Set environment' + Colors.Normal + ' : ' + Colors.Green + "'" + match[1] + '=' + match[2] + "'" + Colors.Normal);
      }

      return true;
    }

    return false;
  }

  private static isDynamicPattern(item: string, options?: glob.Options): boolean {
    if (!item || item.match(/^['|"].*['|"]$/) !== null) return false;

    return glob.isDynamicPattern(item.replace(/\\./g, ''), options);
  }

  private static splitString(value: string): string[] {
    const result = [];
    let last = 0;
    let index = 0;

    while (index < value.length) {
      const char = value[index];

      if (char === ' ') {
        result.push(value.substr(last, index - last));

        last = index + 1;
      }

      if (char === '"') {
        while (++index < value.length && value[index] !== '"');
      }

      if (char === "'") {
        while (++index < value.length && value[index] !== "'");
      }

      index++;
    }

    result.push(value.substr(last, index - last));

    return result;
  }

  private static expandGlobs(pattern: string, options?: glob.Options): string {
    const result: string[] = [];

    for (const item of Executor.splitString(pattern)) {
      let value = [item];

      if (Executor.isDynamicPattern(item, options)) {
        value = glob.sync(item, options);

        if ((options as any).nonull && value.length === 0) value = [item];
      }

      result.push(...value);
    }

    return result.join(' ');
  }

  private static getCommandInfo(command: string, options: ISpawnOptions): { command: string; args: string[]; options: ISpawnOptions } {
    if (!command) command = '';

    options = { ...options };
    options.env = { ...options.env };

    command = Executor.expandEnvironment(command, options.env);

    if (!options.cwd) options.cwd = '';

    let args = [];

    if (!options.shell) {
      args = stringToArgv(command);
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
      if (options.testmode) {
        console.log(''.padEnd(32, '-'));
      } else {
        console.log(''.padEnd(process.stdout.columns, '-'));
      }

      return { command: null, args, options };
    }

    if (command.startsWith('#')) {
      Logger.log(Colors.Bold + 'Skipping action' + Colors.Normal + ' : ' + Colors.Green + "'" + command + "'" + Colors.Normal, args);

      return { command: null, args, options };
    }

    if (command.endsWith(' || true')) {
      command = command.replace(/ \|\| true$/, '');

      options.suppress = true;
    }

    if (Executor.extendEnvironment(options.env, command)) return { command: null, args, options };

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

  private static isCircular(tasks: Array<ITasks | string>): boolean {
    for (const task of tasks) {
      if (typeof task !== 'string') {
        if (task.circular) return true;

        if (Executor.isCircular(task.concurrent)) return true;
        if (Executor.isCircular(task.sequential)) return true;
        if (Executor.isCircular(task['concurrent-then'])) return true;
        if (Executor.isCircular(task['sequential-then'])) return true;
        if (Executor.isCircular(task['concurrent-else'])) return true;
        if (Executor.isCircular(task['sequential-else'])) return true;
      }
    }

    return false;
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

  private expand(scriptInfo: IScriptInfo, parents: string[] = []): ITasks {
    const script = scriptInfo.script;
    const repeater = (script as IScriptTask).repeater;
    const result: ITasks = {
      'circular': false,
      'parameters': {},
      'confirm': [],
      'condition': [],
      'exclusion': [],
      'concurrent': [],
      'sequential': [],
      'concurrent-then': [],
      'sequential-then': [],
      'concurrent-else': [],
      'sequential-else': []
    };
    const environment = {
      ...scriptInfo.parameters,
      ...this.settings.values
    };

    for (const [name, value] of Object.entries(scriptInfo.parameters)) {
      if (value === undefined) {
        throw new Error('The parameter "' + name + '" of script "' + scriptInfo.name + '" is ' + value + '.');
      }
    }

    if (!repeater) {
      const confirm: IScript[] = [];
      const concurrent: IScript[] = [];
      const sequential: IScript[] = [];
      const concurrentThen: IScript[] = [];
      const sequentialThen: IScript[] = [];
      const concurrentElse: IScript[] = [];
      const sequentialElse: IScript[] = [];

      if (script instanceof Array) (scriptInfo.inline ? concurrent : sequential).push(...script);
      if (typeof script === 'string') sequential.push(script);

      parents = [...parents, scriptInfo.name];

      confirm.push(...this.preprocessScripts((script as IScriptTask).confirm));
      concurrent.push(...this.preprocessScripts((script as IScriptTask).concurrent));
      sequential.push(...this.preprocessScripts((script as IScriptTask).sequential));
      concurrentThen.push(...this.preprocessScripts((script as IScriptTask)['concurrent-then']));
      sequentialThen.push(...this.preprocessScripts((script as IScriptTask)['sequential-then']));
      concurrentElse.push(...this.preprocessScripts((script as IScriptTask)['concurrent-else']));
      sequentialElse.push(...this.preprocessScripts((script as IScriptTask)['sequential-else']));

      result.parameters = scriptInfo.parameters;
      result.confirm.push(...this.expandConstraint(parents, (script as IScriptTask).confirm, environment, scriptInfo.arguments, result));
      result.condition.push(...this.expandConstraint(parents, (script as IScriptTask).condition, environment, scriptInfo.arguments, result));
      result.exclusion.push(...this.expandConstraint(parents, (script as IScriptTask).exclusion, environment, scriptInfo.arguments, result));
      result.concurrent.push(...this.expandTasks(parents, concurrent, environment, scriptInfo.arguments, scriptInfo.parameters, result));
      result.sequential.push(...this.expandTasks(parents, sequential, environment, scriptInfo.arguments, scriptInfo.parameters, result));
      result['concurrent-then'].push(...this.expandTasks(parents, concurrentThen, environment, scriptInfo.arguments, scriptInfo.parameters, result));
      result['sequential-then'].push(...this.expandTasks(parents, sequentialThen, environment, scriptInfo.arguments, scriptInfo.parameters, result));
      result['concurrent-else'].push(...this.expandTasks(parents, concurrentElse, environment, scriptInfo.arguments, scriptInfo.parameters, result));
      result['sequential-else'].push(...this.expandTasks(parents, sequentialElse, environment, scriptInfo.arguments, scriptInfo.parameters, result));
    } else {
      let array = repeater.replace(/^\$/, '');

      array = Executor.expandArguments(array, scriptInfo.arguments);
      array = Executor.expandEnvironment(array, environment);

      const settings = this.settings.arrays[array] || [];
      const repeaterTask: IScriptInfo = {
        name: scriptInfo.name,
        inline: scriptInfo.inline,
        multiple: false,
        parameters: null,
        arguments: scriptInfo.arguments,
        script: { ...(scriptInfo.script as IScriptTask) }
      };

      (repeaterTask.script as IScriptTask).repeater = null;

      for (const setting of settings) {
        repeaterTask.parameters = { ...scriptInfo.parameters, ...setting };

        const task = this.expand(repeaterTask);

        result.sequential.push({
          'circular': false,
          'parameters': repeaterTask.parameters,
          'confirm': task.confirm,
          'condition': task.condition,
          'exclusion': task.exclusion,
          'concurrent': task.concurrent,
          'sequential': task.sequential,
          'concurrent-then': task['concurrent-then'],
          'sequential-then': task['sequential-then'],
          'concurrent-else': task['concurrent-else'],
          'sequential-else': task['sequential-else']
        });
      }
    }

    return result;
  }

  private expandConstraint(parents: string[], constraints: string | string[], environment: { [name: string]: string }, args: string[], meta: { circular: boolean }): string[] {
    const result = [];

    if (!constraints) return result;

    if (typeof constraints === 'string') constraints = [constraints];

    if (!(constraints instanceof Array)) throw new Error('Constraint object value not supported: ' + stringify(constraints));

    for (let constraint of constraints) {
      constraint = Executor.expandArguments(constraint, args);
      constraint = Executor.expandEnvironment(constraint, environment);

      const scripts = this.scripts.find(constraint);
      const scriptInfo = Scripts.select(scripts, parents, meta);

      if (scriptInfo) {
        if (scriptInfo.multiple) {
          for (let script of scriptInfo.script) {
            script = Executor.expandArguments(script, args);
            script = Executor.expandEnvironment(script, environment);

            result.push(script);
          }

          continue;
        }

        scriptInfo.arguments = [scriptInfo.name, ...scriptInfo.arguments];

        result.push(...this.expandConstraint([...parents, constraint], scriptInfo.script as any, { ...this.environment, ...scriptInfo.parameters }, args, meta));
      } else {
        result.push(constraint);
      }
    }

    return result;
  }

  private async executeTasks(tasks: Array<ITasks | string>, options: ISpawnOptions, order: Order, limiter = new Limiter(options.limit)): Promise<IProcesses> {
    const processes: IProcesses = [];
    const suppress = options.suppress;

    for (const task of tasks) {
      options.suppress = suppress;

      if (typeof task === 'string') {
        options.env.launch_time_current = formatTime();
        options.env.launch_time_elapsed = prettyTime(process.hrtime(this.startTime), 'ms');

        if (options.testmode) {
          options.env.launch_time_current = formatTime(new Date('2019-09-16T12:33:42.285').getTime(), 0);
          options.env.launch_time_elapsed = '137ms';
        }

        const info = Executor.getCommandInfo(task, options);

        options = info.options;

        if (info.command) {
          let command = Executor.expandGlobs(info.command, {
            ...this.globOptions,
            ...{ cwd: options.cwd }
          });

          command = Executor.removeEnvironment(command);

          // Remove environment,argument and glob escapings
          command = command.replace(/\\(.)/g, '$1');

          if (process.platform === 'win32') {
            command = Executor.convertSingleQuote(command);

            if (command.startsWith('echo')) command = 'echo' + command.replace('echo', '').replace(/^\s*\"(.*)\"\s*$/g, ' $1');
          }

          Logger.log(Colors.Bold + 'Spawn action   ' + Colors.Normal + ' : ' + Colors.Green + "'" + command + "'" + Colors.Normal, info.args);
          Logger.log('Spawn options   : { order=' + Colors.Cyan + Order[order] + Colors.Normal + ', supress=' + Colors.Yellow + options.suppress + Colors.Normal + ' }');

          await limiter.enter();

          const commandProcess = Process.spawn(command, info.args, options);

          processes.push(commandProcess);

          if (order === Order.sequential) {
            const exitCode = await commandProcess.wait();

            limiter.leave();

            if (exitCode !== 0) break;
          } else {
            commandProcess.wait().then(() => limiter.leave());
          }
        }
      } else {
        const concurrent: Array<ITasks | string> = [...task.concurrent];
        const sequential: Array<ITasks | string> = [...task.sequential];

        if (Executor.containsConstraint(task)) {
          try {
            if (await this.evaluateTask(task, options)) {
              concurrent.push(...task['concurrent-then']);
              sequential.push(...task['sequential-then']);
            } else {
              concurrent.push(...task['concurrent-else']);
              sequential.push(...task['sequential-else']);
            }
          } catch {
            return [];
          }
        }

        const concurrentProcesses = this.executeTasks(concurrent, options, Order.concurrent, limiter);
        const sequentialProcesses = this.executeTasks(sequential, options, Order.sequential, limiter);

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

  private async evaluateConstraint(type: string, command: string, options: ISpawnOptions, outputPattern: string): Promise<boolean> {
    if (outputPattern) Logger.log('Grep pattern    : ' + Colors.Green + "'" + outputPattern + "'" + Colors.Normal);

    options = { ...options };

    const evaluateExpression = eval;

    try {
      const result = evaluateExpression(command);

      if (typeof result !== 'boolean') throw new Error('type not supported');

      Logger.log(Colors.Bold + type + '       : ' + Colors.Normal + Colors.Green + "'" + command + "'" + Colors.Normal);

      Logger.log('Result          : ' + result);
      Logger.log();
      Logger.log();

      return result;
    } catch (error) {
      // Not a valid javascript expression, continue
    }

    if (process.platform === 'win32') {
      command = Executor.convertSingleQuote(command);

      if (command.startsWith('echo')) command = 'echo' + command.replace('echo', '').replace(/^\s*\"(.*)\"\s*$/g, ' $1');
    }

    Logger.log(Colors.Bold + type + '       : ' + Colors.Normal + Colors.Green + "'" + command + "'" + Colors.Normal);

    if (fs.existsSync(path.join(path.resolve(options.cwd), command))) {
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
        options.extraLogInfo = process => {
          const matches = (process.stdout + process.stderr).match(outputPattern);

          return 'grep=' + (matches === null ? 'failed' : 'success');
        };
      }

      const commandProcess = Process.spawn(command, [], options);
      const exitCode = await commandProcess.wait();

      if (outputPattern) return (commandProcess.stdout + commandProcess.stderr).match(outputPattern) != null;

      return exitCode === 0;
    } catch {
      return false;
    }
  }

  private async evaluateTask(task: ITasks, options: ISpawnOptions): Promise<boolean> {
    let condition = true;
    let exclusion = false;
    let confirmation = !(task.confirm.length > 0);

    options = { ...options };

    if (!options.cwd) options.cwd = '';

    for (let constraint of task.condition) {
      constraint = Executor.expandEnvironment(constraint, options.env);

      if (!Executor.extendEnvironment(options.env, constraint)) {
        const outputMatches = constraint.match(/(.*)\|\?(.*)/);
        let outputPattern: string = null;

        if (outputMatches !== null) {
          constraint = outputMatches[1].trim();
          outputPattern = Executor.expandEnvironment(outputMatches[2].trim(), options.env);
          outputPattern = Executor.removeEnvironment(outputPattern);
        }

        constraint = Executor.expandGlobs(constraint, {
          ...this.globOptions,
          ...{ cwd: options.cwd }
        });

        constraint = Executor.removeEnvironment(constraint);

        // Remove environment and argument escaping
        constraint = constraint.replace(/\\\$/g, '$');

        if (!(await this.evaluateConstraint('Condition', constraint, options, outputPattern))) {
          condition = false;
          break;
        }
      }
    }

    for (let constraint of task.exclusion) {
      constraint = Executor.expandEnvironment(constraint, options.env);

      if (!Executor.extendEnvironment(options.env, constraint)) {
        const outputMatches = constraint.match(/(.*)\|\?(.*)/);
        let outputPattern: string = null;

        if (outputMatches !== null) {
          constraint = outputMatches[1].trim();
          outputPattern = Executor.expandEnvironment(outputMatches[2].trim(), options.env);
          outputPattern = Executor.removeEnvironment(outputPattern);
        }

        constraint = Executor.expandGlobs(constraint, {
          ...this.globOptions,
          ...{ cwd: options.cwd }
        });

        constraint = Executor.removeEnvironment(constraint);

        if (await this.evaluateConstraint('Exclusion', constraint, options, outputPattern)) {
          exclusion = true;
          break;
        }
      }
    }

    for (let confirm of task.confirm) {
      confirm = Executor.expandEnvironment(confirm, options.env);

      confirm = Executor.expandGlobs(confirm, {
        ...this.globOptions,
        ...{ cwd: options.cwd }
      });

      confirm = Executor.removeEnvironment(confirm);

      Logger.log(Colors.Bold + 'Confirm         : ' + Colors.Normal + Colors.Green + "'" + confirm + "'" + Colors.Normal);

      confirmation = await confirmPrompt(confirm, this.confirm);

      if (!confirmation) break;
    }

    return condition && confirmation && !exclusion;
  }

  private expandTasks(
    parents: string[],
    tasks: IScript[],
    environment: { [name: string]: string },
    args: string[],
    parameters: { [name: string]: string },
    meta: { circular: boolean }
  ): Array<ITasks | string> {
    const result: Array<ITasks | string> = [];

    for (let task of tasks) {
      if (typeof task === 'string') {
        task = Executor.expandArguments(task, args);
        task = Executor.expandEnvironment(task, environment);

        const scripts = this.scripts.find(task);
        const scriptInfo = Scripts.select(scripts, parents, meta);

        if (scriptInfo) {
          if (scriptInfo.multiple) {
            for (let script of scriptInfo.script) {
              script = Executor.expandArguments(script, args);
              script = Executor.expandEnvironment(script, environment);

              result.push(script);
            }

            continue;
          }

          scriptInfo.arguments = [scriptInfo.name, ...scriptInfo.arguments];

          const tasks = this.expand(scriptInfo, parents);

          if (!Executor.isEmptyTask(tasks)) result.push(tasks);
        } else {
          if (tasks.length === 1 && parents.length > 0 && task === parents[parents.length - 1]) task = Executor.expandArguments(task + ' $*', args);

          result.push(task);
        }
      } else {
        const scriptInfo: IScriptInfo = {
          name: 'inline-script-block',
          inline: true,
          multiple: false,
          parameters: parameters,
          arguments: args,
          script: task
        };

        if ((task as IScriptTask).repeater) {
          result.push(...this.expand(scriptInfo, parents).sequential);
        } else {
          result.push(this.expand(scriptInfo, parents));
        }
      }
    }

    return result;
  }
}
