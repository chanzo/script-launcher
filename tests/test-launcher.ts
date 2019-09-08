import * as launcher from '../src/launch';
import { ConsoleInterceptor, IIntercepted } from './console-interceptor';
import * as fs from 'fs';
import * as path from 'path';
import { MarkdownParser } from './markdown-parser';

export interface ITests {
  name?: string;
  'cmd-args': string[];
  'npm-args': string[];
  lifecycle?: string;
  result?: string[];
}

export interface ITestConfig {
  name?: string;
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

  public async launch(lifecycleEvent: string, directory: string, processArgv: string[], npmConfigArgv: string = ''): Promise<IIntercepted> {
    const testDirectory = path.join(this.tempPath, directory);

    const interceptor = new ConsoleInterceptor();

    await launcher.main(lifecycleEvent, [...this.defaultArgs, '--directory=' + testDirectory, ...processArgv], npmConfigArgv, true);

    interceptor.close();

    return interceptor;
  }

  public load(testFiles: string): void {
    const files = fs.readdirSync(testFiles);
    const result = this._configs;

    for (const file of files) {
      if (file.endsWith('.test.json') && !file.endsWith('launcher-config.json')) {
        const content = fs.readFileSync(path.join(testFiles, file));
        const configs = JSON.parse(content.toString()) as { [name: string]: ITestConfig[] };

        for (const [name, testConfigs] of Object.entries(configs)) {
          if (result[name] === undefined) result[name] = [];

          for (const testConfig of testConfigs) {
            if (testConfig.tests === undefined) testConfig.tests = [];

            for (const test of testConfig.tests) {
              if (test['cmd-args'] === undefined) test['cmd-args'] = [];
              if (test['npm-args'] === undefined) test['npm-args'] = [];

              if (!Array.isArray(test['cmd-args'])) test['cmd-args'] = [test['cmd-args']];
              if (!Array.isArray(test['npm-args'])) test['npm-args'] = [test['npm-args']];
              if (!Array.isArray(test.result) && test.result !== undefined) test.result = [test.result];

              if (!test.name) {
                test.name = 'launch  ' + test['cmd-args'].join(' ');

                if (test.lifecycle) {
                  test.name = 'npm ';

                  if (test.lifecycle !== 'start') test.name += 'run   ';

                  test.name += test.lifecycle + ' ' + test['npm-args'].join(' ');
                }
              }
            }
          }

          result[name].push(...testConfigs);
        }
      }
    }
  }

  public markdown(testFiles: string, category: string, exclude: string[] = []): void {
    const markdownParser = new MarkdownParser(testFiles, exclude);
    const sections = markdownParser.getSectionTests();
    let configs = this._configs[category];

    if (configs === undefined) {
      configs = [];
      this._configs[category] = configs;
    }

    for (const section of sections) {
      let config = configs.find((item) => item.name === section.title);

      if (config === undefined) {
        config = {
          name: section.title,
          files: undefined,
          tests: []
        };

        configs.push(config);
      }

      if (config.files !== undefined) {
        console.error('Config file block \"' + section.title + '\" is not empty!');
        continue;
      }

      config.files = {
        'launcher-config': section.config
      };
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
