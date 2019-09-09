import * as launcher from '../src/launch';
import { ConsoleInterceptor, IIntercepted } from './console-interceptor';
import * as fs from 'fs';
import * as path from 'path';
import { MarkdownParser } from './markdown-parser';

export interface ITests {
  name?: string;
  error?: string;
  'cmd-args': string[];
  'npm-args': string[];
  lifecycle?: string;
  result?: string[];
}

export type ConfigContent = any;
type TransformCallback = (name: string, config: ConfigContent) => ConfigContent;

export interface ITestConfig {
  name?: string;
  transform?: string,
  files: { [name: string]: ConfigContent };
  tests: ITests[];
}

export class TestLauncher {
  private readonly defaultArgs: string[];
  private readonly _configs: { [name: string]: ITestConfig[] };
  private readonly transforms: { [name: string]: TransformCallback } = {
    sequentialScripts: (name: string, config: ConfigContent) => {
      return config;
    }
  }

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
          files: undefined,
          tests: []
        };

        configs.push(config);
      }

      if (section.error) {
        for (const test of config.tests) {
          config.tests = [{
            name: test.name,
            error: section.error,
            ...emptyTest
          }];
        }
        continue;
      }

      if (config.files !== undefined) {
        for (const test of config.tests) {
          config.tests = [{
            name: test.name,
            error: 'The file section of a markdown test should be empty!',
            ...emptyTest
          }];
        }
        continue;
      }

      for (const command of section.commands) {
        const test = config.tests.find((item) => item.name === command);

        if (!test) config.tests.push({
          name: command,
          error: 'Markdown example is missing test command: ' + command,
          ...emptyTest
        });
      }

      config.files = {
        'launcher-config': section.config
      };
    }
  }

  public create(directory: string, files: { [name: string]: ConfigContent }) {
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
