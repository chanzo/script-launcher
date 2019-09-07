import * as launcher from '../src/launch';
import { ConsoleInterceptor, IIntercepted } from './console-interceptor';
import * as fs from 'fs';
import * as path from 'path';

export interface ITests {
  command: string;
  result: string[];
}

export interface ITestConfig {
  name: string;
  files: { [name: string]: any };
  tests: ITests[];
}

export class TestLauncher {
  private readonly defaultArgs: string[];
  private readonly _configs: { [name: string]: ITestConfig[] };

  public get configs(): Array<[string, ITestConfig[]]> {
    return Object.entries(this._configs);
  }

  constructor(private readonly tempPath: string, ...defaultArgs: string[]) {
    this.defaultArgs = defaultArgs;
    this._configs = {};
  }

  public async launch(directory: string, processArgv: string[], npmConfigArgv: string = ''): Promise<IIntercepted> {
    const testDirectory = path.join(this.tempPath, directory);

    const interceptor = new ConsoleInterceptor();

    await launcher.main([...this.defaultArgs, '--directory=' + testDirectory, ...processArgv], npmConfigArgv, true);

    interceptor.close();

    return interceptor;
  }

  public load(testFiles: string, filter: string = ''): void {
    const files = fs.readdirSync(testFiles);
    const result = this._configs;
    const expression = new RegExp(filter);

    for (const file of files) {
      if (file.endsWith('.json') && !file.endsWith('launcher-config.json')) {
        const content = fs.readFileSync(path.join(testFiles, file));
        const configs = JSON.parse(content.toString()) as { [name: string]: ITestConfig[] };

        for (const [name, config] of Object.entries(configs)) {
          if (result[name] === undefined) result[name] = [];

          const tests = config.filter((item) => item.name.match(expression));

          result[name].push(...tests);
        }
      }
    }
  }

  public create(directory: string, files: { [name: string]: any }) {
    const testDirectory = path.join(this.tempPath, directory);

    fs.mkdirSync(testDirectory, {
      recursive: true
    });

    this.deleteFiles(testDirectory, 'json$');

    for (const [name, content] of Object.entries(files)) {
      const fileName = path.join(testDirectory, name + '.json');
      fs.writeFileSync(fileName, JSON.stringify(content));
    }
  }

  private deleteFiles(directory: string, pattern: string) {
    const expression = new RegExp(pattern);

    for (const fileName of fs.readdirSync(directory)) {
      if (fileName.match(expression)) {
        const filePath = path.join(directory, fileName);

        fs.unlinkSync(filePath);
      }
    }
  }
}
