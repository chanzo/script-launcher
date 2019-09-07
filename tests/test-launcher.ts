import * as launcher from '../src/launch';
import { ConsoleInterceptor, IIntercepted } from './console-interceptor';
import * as fs from 'fs';
import * as path from 'path';

export interface ITests {
  command: string,
  result: string[]
}

export interface ITestConfig {
  name: string,
  files: { [name: string]: any },
  tests: ITests[]
}

export class TestLauncher {
  private readonly defaultArgs: string[];
  private readonly _configs: { [name: string]: ITestConfig[] };

  public get configs(): Array<[string, ITestConfig[]]> {
    return Object.entries(this._configs);
  }

  constructor(private readonly tempPath: string, ...defaultArgs: string[]) {
    this.defaultArgs = defaultArgs;
    this._configs = {}
  }

  public async launch(directory: string, processArgv: string[], npmConfigArgv: string = ''): Promise<IIntercepted> {
    const currentDirectory = process.cwd();

    try {
      const testDirectory = path.join(this.tempPath, directory);

      process.chdir(testDirectory);

      const interceptor = new ConsoleInterceptor();

      await launcher.main([...this.defaultArgs, ...processArgv], npmConfigArgv);

      interceptor.close();

      return interceptor;
    } finally {
      process.chdir(currentDirectory);
    }
  }

  load(testFiles: string): void {
    const files = fs.readdirSync(testFiles);
    const result = this._configs;

    for (const file of files) {
      if (file.endsWith('.json') && !file.endsWith('launcher-config.json')) {
        const content = fs.readFileSync(path.join(testFiles, file));
        const configs = JSON.parse(content.toString()) as { [name: string]: ITestConfig[] };

        for (let [name, config] of Object.entries(configs)) {
          if (result[name] === undefined) result[name] = [];

          result[name].push(...config);
        }
      }
    }
  }

  private deleteFiles(directory: string, pattern: RegExp) {
    for (const fileName of fs.readdirSync(directory)) {
      if (fileName.match(pattern)) {
        const filePath = path.join(directory, fileName);

        fs.unlinkSync(filePath);
      }
    }
  }

  create(directory: string, files: { [name: string]: any }) {
    const testDirectory = path.join(this.tempPath, directory);

    try {
      fs.mkdirSync(testDirectory, {
        recursive: true
      });
    } catch{

    }


    this.deleteFiles(testDirectory, /json$/);

    for (const [name, content] of Object.entries(files)) {
      const fileName = path.join(testDirectory, name + '.json');
      fs.writeFileSync(fileName, JSON.stringify(content));
    }
  }

}
