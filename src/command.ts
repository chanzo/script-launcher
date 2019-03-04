import { ICommand } from './config-loader';
import { Scripts } from "./scripts";
import { SpawnOptions } from 'child_process';
import { Process } from './spawn-process';
import * as stringArgv from 'string-argv';
import { Logger } from './logger';

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

  private static async spawnCommands(commands: string[], shell: string, args: string[], options: SpawnOptions, concurrent: boolean): Promise<Process[]> {
    const processes: Process[] = [];
    const message = concurrent ? 'Spawn concurrent: ' : 'Spawn sequential: ';

    for (const command of commands) {
      const spawnArgs = [...args, ...stringArgv(command)];
      let scriptShell = shell;

      if (!scriptShell) {
        scriptShell = spawnArgs[0];
        spawnArgs.shift();
      }

      Logger.log(message, scriptShell, spawnArgs);

      const process = Process.spawn(scriptShell, spawnArgs, options);
      // const process = Process.exec(scriptShell, spawnArgs, options as ExecOptions);

      Logger.debug(`Process ${process.pid} started.`);

      if (!concurrent) await process.wait();

      processes.push(process);
    }

    return processes;
  }

  private readonly scripts: Scripts;
  private readonly nestedShell: string;
  private readonly args: string[];
  private readonly environment: { [name: string]: string };

  public constructor(nestedShell: string, args: string[], environment: { [name: string]: string }, scripts: Scripts) {
    this.scripts = scripts;
    this.nestedShell = nestedShell;
    this.args = args;
    this.environment = environment;
  }

  public async execute(scriptShell: string, command: string | string[] | ICommand): Promise<number> {
    const options: SpawnOptions = {
      stdio: 'inherit',
      env: this.environment,
    };

    const commands = this.prepareCommands(command);

    Logger.debug('Prepared commands: ', commands);

    if (commands.concurrent.length === 0 && commands.sequential.length === 0) throw new Error('missing script');

    const processes: Process[] = [];
    const args = stringArgv(scriptShell);

    scriptShell = args[0];

    args.shift();

    processes.push(...await Command.spawnCommands(commands.concurrent, scriptShell, args, options, true));
    processes.push(...await Command.spawnCommands(commands.sequential, scriptShell, args, options, false));

    let exitCode = 0;

    for (const process of processes) {
      exitCode += await process.wait();
    }

    return exitCode;
  }

  private prepareCommands(command: string | string[] | ICommand): { concurrent: string[], sequential: string[] } {
    const concurrent: string[] = [];
    const sequential: string[] = [];

    if (command instanceof Array) sequential.push(...command);
    if (typeof command === 'string') sequential.push(command);
    if (command instanceof String) sequential.push(command.toString());

    if ((command as ICommand).concurrent) concurrent.push(...(command as ICommand).concurrent);
    if ((command as ICommand).sequential) sequential.push(...(command as ICommand).sequential);

    return {
      concurrent: this.resolveReferences(concurrent),
      sequential: this.resolveReferences(sequential),
    };
  }

  private static expandReferences(command: string, scripts: Scripts): string {

    //scripts.



    return command;
  }

  private resolveReferences(commands: string[]): string[] {
    const result = [...commands];

    for (let index = 0; index < commands.length; index++) {
      let command = Command.expandArguments(commands[index], this.args);

      command = Command.expandEnvironment(command, this.environment);
      command = Command.expandReferences(command, this.scripts);

      // if (this.packageScripts.includes(command)) command = this.nestedShell + ' ' + command;
      //if (command.match(/^((\w+\:\w+)+$)/) != null) command = this.nestedShell + ' ' + command;

      result[index] = command;
    }

    return result;
  }
}
