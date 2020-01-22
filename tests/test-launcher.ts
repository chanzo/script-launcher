import * as launcher from '../src/launch';
import { ConsoleInterceptor, IIntercepted } from './console-interceptor';
import * as fs from 'fs';
import * as path from 'path';
import { MarkdownParser } from './markdown-parser';
import { IConfig } from '../src/config-loader';
import { version } from '../src/package.json';

export interface ITests {
  name: string;
  error?: string;
  'cmd-args': string[];
  'npm-args': string[];
  'cat-args': string[];
  lifecycle?: string;
  result?: string[];
  restore: boolean;
}

interface ITestsConfigFile {
  name: string;
  error?: string;
  'cmd-args': string[] | string;
  'npm-args': string[] | string;
  'cat-args': string[] | string;
  lifecycle?: string;
  restore?: boolean;
  result: string[];
  // [result: string]: string[] | string;
}

export type TransformCallback = (name: string, config: IConfig) => IConfig;

export interface ITestConfig {
  id: string;
  name: string;
  transformer?: string;
  files: { [name: string]: IConfig };
  tests: ITests[];
}

export class TestLauncher {
  private readonly _configs: { [name: string]: ITestConfig[] };

  public get configs(): Array<[string, ITestConfig[]]> {
    return Object.entries(this._configs);
  }

  constructor(
    private readonly tempPath: string,
    private readonly defaultArgs: string[],
    private readonly excludes: string[] = []
  ) {
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
    const testDirectory = path.join(this.tempPath, directory).replace(process.cwd(), '.');
    const interceptor = new ConsoleInterceptor(this.excludes);

    try {
      await launcher.main(lifecycleEvent, [...this.defaultArgs, '--directory=' + testDirectory, ...processArgv], npmConfigArgv, true);

      // await promisify(setImmediate)(); // Proccess all events in event queue, to flush the out streams.
      // await promisify(setTimeout)(10);
      // await promisify(setImmediate)();
    } finally {
      interceptor.close();
    }

    return interceptor;
  }

  public loadConfig(testFiles: string): void {
    const files = fs.readdirSync(testFiles);
    const result = this._configs;
    let autoId = 0;

    for (const file of files) {
      if (file.endsWith('.test.json') && !file.endsWith('launcher-config.json')) {
        const fileName = path.join(testFiles, file);
        const content = fs.readFileSync(fileName);
        const configs = JSON.parse(content.toString()) as { [name: string]: ITestConfig[] };

        // update and add auto id's
        for (const testConfigs of Object.values(configs)) {
          for (let index = 0; index < testConfigs.length; index++) {
            testConfigs[index] = {
              ...{ id: '0000' },
              ...testConfigs[index]
            };

            testConfigs[index].id = (autoId++).toString().padStart(4, '0');
          }
        }

        fs.writeFileSync(fileName, JSON.stringify(configs, null, 2));

        for (const [name, testConfigs] of Object.entries(configs)) {

          if (result[name] === undefined) result[name] = [];

          for (const testConfig of testConfigs) {
            if (testConfig.tests === undefined) testConfig.tests = [];

            for (const test of testConfig.tests as ITestsConfigFile[]) {
              if (test['cmd-args'] === undefined) test['cmd-args'] = [];
              if (test['npm-args'] === undefined) test['npm-args'] = [];
              if (test['cat-args'] === undefined) test['cat-args'] = [];
              if (test.restore === undefined) test.restore = false;

              if (!Array.isArray(test['cmd-args'])) test['cmd-args'] = [test['cmd-args']];
              if (!Array.isArray(test['npm-args'])) test['npm-args'] = [test['npm-args']];
              if (!Array.isArray(test['cat-args'])) test['cat-args'] = [test['cat-args']];

              let result = test.result;

              if (test['result:' + process.platform] !== undefined) result = test['result:' + process.platform];

              if (!Array.isArray(result) && result !== undefined) result = [result];

              for (let index = 0; index < result.length; index++) {
                (result as string[])[index] = TestLauncher.expandEnvironment(result[index], {
                  id: testConfig.id,
                  version: version,
                  node_version: process.version.replace(/^v/, '')
                });
              }

              if (test['cat-args'].length > 0) {

                if (test.lifecycle !== undefined) test.error = 'cat-args and lifecycle can not be combined';
                if (test['cmd-args'].length > 0) test.error = 'cat-args and cmd-args can not be combined';
                if (test['npm-args'].length > 0) test.error = 'cat-args and npm-args can not be combined';
              }

              test.result = result;

              if (!test.name) {
                test.name = 'npx launch ' + test['cmd-args'].join(' ');

                if (test.lifecycle) {
                  test.name = 'npm ';

                  if (test.lifecycle !== 'start') test.name += 'run   ';

                  test.name += (test.lifecycle + ' ' + test['npm-args'].join(' ')).trim();
                }

                if (test['cat-args'].length > 0) {
                  test.name = 'cat ' + test['cat-args'].join(' ');
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
      'name': 'empty',
      'npm-args': [],
      'cmd-args': [],
      'cat-args': [],
      'restore': false
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
          id: '9999',
          name: section.title,
          files: {},
          tests: []
        };

        configs.push(config);
      }

      if (section.commands.length === 0) {
        config.tests = [{
          ...emptyTest,
          name: 'Missing command',
          error: 'Markdown section is missing test commands!'
        }];
        continue;
      }

      if (section.error) {
        config.tests = [];
        for (const command of section.commands) {
          config.tests.push({
            ...emptyTest,
            name: command,
            error: section.error
          });
        }
        continue;
      }

      if (config.tests.length > 0) {
        for (const command of section.commands) {
          const test = config.tests.find((item) => item.name === command);

          if (!test) config.tests.push({
            ...emptyTest,
            name: command,
            error: 'Markdown example is missing test command: ' + command
          });
        }
      } else {
        for (const command of section.commands) {
          config.tests.push({
            ...emptyTest,
            name: command
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

  private static expandEnvironment(text: string, environment: { [name: string]: string }, remove: boolean = false): string {
    let previousText: string;

    do {
      previousText = text;

      for (const [name, value] of Object.entries(environment)) {
        text = text.replace(new RegExp('(.|^)\\$' + name + '([^\\w]|$)', 'g'), '$1' + value + '$2');
        text = text.replace(new RegExp('(.|^)\\$\\{' + name + '\\}', 'g'), '$1' + value);

        if (text.match(/([^\\]|^)\$/) === null) break;
      }
    } while (text.match(/([^\\]|^)\$/) !== null && text !== previousText);

    if (!remove) return text;

    text = text.replace(/([^\\]|^)\$\w+/g, '$1');
    text = text.replace(/([^\\]|^)\$\{\w+\}/g, '$1');

    return text;
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
