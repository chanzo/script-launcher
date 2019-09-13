import * as launcher from '../src/launch';
import { ConsoleInterceptor, IIntercepted } from './console-interceptor';
import * as fs from 'fs';
import * as path from 'path';
import { MarkdownParser } from './markdown-parser';
import { IConfig } from '../src/config-loader';

export interface ITests {
  name?: string;
  error?: string;
  'cmd-args': string[];
  'npm-args': string[];
  lifecycle?: string;
  result?: string[];
}

export type TransformCallback = (name: string, config: IConfig) => IConfig;

export interface ITestConfig {
  name?: string;
  transformer?: string;
  files: { [name: string]: IConfig };
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

    fs.mkdirSync(tempPath, {
      recursive: true
    });

    for (const directory of fs.readdirSync(tempPath)) {
      const fullDirectoryName = path.join(tempPath, directory);

      for (const file of fs.readdirSync(fullDirectoryName)) {
        const fullFileName = path.join(fullDirectoryName, file);
        fs.unlinkSync(fullFileName);
      }

    }
  }

  public async launch(lifecycleEvent: string, directory: string, processArgv: string[], npmConfigArgv: string = ''): Promise<IIntercepted> {
    const testDirectory = path.join(this.tempPath, directory);

    const interceptor = new ConsoleInterceptor();

    await launcher.main(lifecycleEvent, [...this.defaultArgs, '--directory=' + testDirectory, ...processArgv], npmConfigArgv, true);

    interceptor.close();

    return interceptor;
  }

  public loadConfig(testFiles: string): void {
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

                  test.name += (test.lifecycle + ' ' + test['npm-args'].join(' ')).trim();
                }
              }
            }
          }

          result[name].push(...testConfigs);
        }
      }
    }
  }

  public loadMarkdown(testFiles: string, category: string, exclude: string[] = []): void {
    const markdownParser = new MarkdownParser(testFiles, exclude);
    const sections = markdownParser.getSectionTests();
    const emptyTest: ITests = {
      'npm-args': [],
      'cmd-args': []
    };
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
          files: {},
          tests: []
        };

        configs.push(config);
      }

      if (section.commands.length === 0) {
        config.tests = [{
          name: 'Missing command',
          error: 'Markdown section is missing test commands!',
          ...emptyTest
        }];
        continue;
      }

      if (section.error) {
        config.tests = [];
        for (const command of section.commands) {
          config.tests.push({
            name: command,
            error: section.error,
            ...emptyTest
          });
        }
        continue;
      }

      // if (section.title === 'Interactive menu') {
      //   console.log('*******************', config);
      // }

      if (config.tests.length > 0) {
        for (const command of section.commands) {
          const test = config.tests.find((item) => item.name === command);

          if (!test) config.tests.push({
            name: command,
            error: 'Markdown example is missing test command: ' + command,
            ...emptyTest
          });
        }
      } else {
        for (const command of section.commands) {
          config.tests.push({
            name: command,
            ...emptyTest
          });
        }
      }

      if (config.files !== undefined && config.files['launcher-config'] !== undefined) {
        for (const test of config.tests) {
          test.error = 'A markdown test should not have a \"launcher-config\" file content!';
        }
        continue;
      }

      config.files = {
        ...config.files,
        ...{ 'launcher-config': section.config }
      };
    }
  }

  public transformConfigs(transforms: { [name: string]: TransformCallback }): void {

    for (const [name, configs] of Object.entries(this._configs)) {
      for (const testConfig of configs) {
        if (testConfig.transformer) {
          const transform = transforms[testConfig.transformer];

          if (!transform) {
            for (const test of testConfig.tests) {
              if (!test.error) test.error = 'Transform not found: ' + testConfig.transformer;
            }
            continue;
          }

          if (!testConfig.files) {
            for (const test of testConfig.tests) {
              if (!test.error) test.error = 'No files to transform: ' + testConfig.transformer;
            }
            continue;
          }

          for (const [name, config] of Object.entries(testConfig.files)) {
            try {
              transform(name, config);
            } catch (error) {
              for (const test of testConfig.tests) {
                if (!test.error) test.error = 'Transform error: ' + error.message;
              }
              break;
            }
          }
        }
      }
    }
  }

  public create(directory: string, files: { [name: string]: IConfig }) {
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
