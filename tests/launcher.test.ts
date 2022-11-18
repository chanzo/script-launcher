import { ITestConfig, TestLauncher, TransformCallback } from './test-launcher';
import * as path from 'path';
import { IConfig } from '../src/config-loader';
import { IScript, IScriptTask } from '../src/scripts';
import * as fs from 'fs';
import { SectionType } from './markdown-parser';
import { version } from '../src/package.json';

const testFiles = path.join(__dirname, 'configs');
const tempFiles = path.join(__dirname, 'temp');
const readmeFile = path.join(__dirname, '..', 'src', 'README.md');

const testLauncher = new TestLauncher(tempFiles, ['\u001b[?25l']);

const sanitizeStrings = [
  '\\u001b\\[0m',
  '\\u001b\\[1m',
  '\\u001b\\[2m',
  '\\u001b\\[4m',
  // '\\u001b\\[2K',
  '\\u001b\\[1G',
  '\\u001b\\[36m',
  '\\u001b\\[39m',
  '\\u001b\\[22m',
  '\\u001b\\[24m',
  '\\u001b\\[90m',
  '\\u001b\\[32m',
  '\\u001b\\[94m',
  '\\u001b\\[31m',
  '\\u001b\\[33m',
  '\\r'
  // '\\u001b\\[\\?25l',
];
const excludeStrings = ['ECHO is on.', '\u001b[?25h', '\n'];

function sanitizeOutput(content: ReadonlyArray<string>, config: ITestConfig): ReadonlyArray<string> {
  const result = [];
  let previous: string = null;

  for (let item of content) {
    item = item.replace('tests/temp/' + config.id + '/', '');
    item = item.replace('tests\\temp\\' + config.id + '\\', '');

    item = item.replace('.\\\\tests\\\\temp\\\\' + config.id, './tests/temp/' + config.id);

    item = item.replace(/\√/g, '✔');
    item = item.replace(/\…/g, '...');
    item = item.replace(/\»/g, '›');
    item = item.replace(/\>/g, '❯');

    for (const pattern of sanitizeStrings) {
      item = item.replace(new RegExp(pattern, 'g'), '');
    }

    if (excludeStrings.includes(item)) continue;

    if (item.startsWith('\u001b[2K')) {
      previous = item.replace('\u001b[2K', '');
      continue;
    }

    if (previous) {
      result.push(previous);
      previous = null;
    }

    for (const value of item.split('\n')) {
      result.push(value);
    }
  }

  if (previous) {
    result.push(previous);
    previous = null;
  }

  return result;
}

async function main(): Promise<void> {
  testLauncher.loadConfig(testFiles);
  testLauncher.loadMarkdown(readmeFile, 'Implementation examples (readme.md)', [
    'Installation',
    'Usage examples',
    'Show menu',
    'Start a specific launcher script',
    'List available launcher scripts',
    'Start a specific launch script, by using the `npm run`',
    'Motivation',
    'Implementation examples',
    'Launcher files',
    'Script shell',
    'Menu options',
    'Logging',
    'Limit Concurrency',
    'Launcher options',
    'Glob Options',
    'Migrate package.json scripts',
    'Enable tab completion'
  ]);
  testLauncher.prepareTests();

  const transforms: { [name: string]: TransformCallback } = {
    concurrentScripts: (name: string, config: IConfig) => {
      ((config.scripts['build-stuff'] as IScriptTask).concurrent as IScript[])[0] = 'background:1:100';
      ((config.scripts['build-stuff'] as IScriptTask).concurrent as IScript[])[1] = 'background:2:200';
      ((config.scripts['build-stuff'] as IScriptTask).sequential as IScript[])[1] = 'sleep:25';
      ((config.scripts['build-stuff'] as IScriptTask).sequential as IScript[])[3] = 'sleep:25';

      return config;
    },
    inlineScriptBlocks: (name: string, config: IConfig) => {
      config.scripts['build-stuff'][0][0] = 'background:1:100';
      config.scripts['build-stuff'][0][1] = 'background:2:200';
      config.scripts['build-stuff'][1].sequential[1] = 'sleep:25';
      config.scripts['build-stuff'][1].sequential[3] = 'sleep:25';
      return config;
    }
  };

  testLauncher.transformConfigs(transforms);

  for (const [name, configs] of testLauncher.configs) {
    describe(name, () => {
      for (const config of configs) {
        const directory = config.id.toString().padStart(4, '0');

        if (config.files !== undefined) testLauncher.create(directory, config.files);

        // if (config.name !== 'Environment values and special commands') continue;

        describe(config.name, () => {
          if (config.tests.length === 0) {
            test.todo('test command');
          }

          for (const item of config.tests) {
            if (((item.arguments.length === 0 && item.processArgv.length === 0 && item.files.length === 0 && item.lifecycle === undefined) || item.result === undefined) && !item.error) {
              test.todo(item.name);
              continue;
            }

            // if (config.id !== '0044' || item.name !== 'npx launch init') continue;

            test(
              item.name.padEnd(56),
              async () => {
                if (item.error) throw new Error(item.error);

                if (item.restore && config.files !== undefined) testLauncher.create(directory, config.files);

                let output: ReadonlyArray<string>;

                if (item.files.length > 0) {
                  const content = [];

                  for (const file of item.files) {
                    const fileName = path.join(tempFiles, directory, file);
                    const buffer = fs.readFileSync(fileName);

                    content.push(...buffer.toString().split('\n'));
                  }

                  output = content;
                } else {
                  // The first two parts of the array are always the same and not interpreted in any kind
                  const processArgv = ['path/to/node.exe', 'path/to/launch.js', ...item.processArgv];
                  const envVariables = {};

                  for (const argument of item.arguments) {
                    let [argumentName, argumentValue] = argument.split('=');

                    // If no value is given like e.g. --param=value but --param only, the default value is 'true'
                    argumentValue = argumentValue || 'true';
                    // Removing the leading '--' from the argument
                    argumentName = argumentName.replace('--', '');
                    // SPECIAL CASE: --dry does overlap with native NPM dry, therefore this workaround
                    argumentName = argumentName === 'dry' ? 'dry_run' : argumentName;
                    envVariables['npm_config_' + argumentName.toLowerCase()] = argumentValue;
                  }

                  const result = await testLauncher.launch(directory, processArgv, envVariables);

                  output = result.all;
                }

                if (config.sanitize) output = sanitizeOutput(output, config);

                try {
                  expect(output).toStrictEqual(item.result);
                } catch (error) {
                  if (config.type === SectionType.bash) {
                    console.log('### ' + config.name + ' (' + item.id + ')\n```\n' + output.join('\n') + '\n```\n');
                  } else {
                    let result = JSON.stringify(output, null, 2);

                    result = result.replace(new RegExp(config.id, 'g'), '$id');
                    result = result.replace(new RegExp(version, 'g'), '$version');
                    result = result.replace(new RegExp(process.version.replace(/^v/, ''), 'g'), '$node_version');
                    result = result.replace(new RegExp(process.platform, 'g'), '$platform');

                    console.log('result (' + item.id + '):', result);
                  }

                  throw error;
                }
              },
              20000
            );
          }
        });
      }
    });
  }
}
void main();

afterAll(() => {
  // console.log('afterAll:', new Date().toISOString());
}, 10000);
