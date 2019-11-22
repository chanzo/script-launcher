import { TestLauncher, TransformCallback } from './test-launcher';
import * as path from 'path';
import { IConfig } from '../src/config-loader';
import { IScript, IScriptTask } from '../src/scripts';

const testFiles = path.join(__dirname, 'configs');
const tempFiles = path.join(__dirname, 'temp');
const readmeFile = path.join(__dirname, '..', 'src', 'README.md');

const testLauncher = new TestLauncher(tempFiles, ['', ''], [
  '\u001b[?25l'
]);

async function main() {
  testLauncher.loadConfig(testFiles);
  testLauncher.loadMarkdown(readmeFile, 'Implementation examples (readme.md)', [
    'Installation',
    'Usage examples',
    'Show menu',
    'Start a specific launch script, by using the `npm start`',
    'Start a specific launch script, by using the `npm run`',
    'Motivation',
    'Implementation examples',
    'Launcher files',
    'Script shell',
    'Menu options',
    'Logging',
    'Launcher arguments',
    'Launcher options',
    'Glob Options',
    'Migrate package.json scripts'
  ]);

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

        describe(config.name, () => {
          if (config.tests.length === 0) test.todo('test command');

          for (const item of config.tests) {
            if (((item['cmd-args'].length === 0 && item['npm-args'].length === 0 && item.lifecycle === undefined) || item.result === undefined) && !item.error) {
              test.todo(item.name);
              continue;
            }

            // if (item.name !== 'npm start') continue;

            test(item.name.padEnd(56), async () => {
              if (item.error) throw new Error(item.error);

              const result = await testLauncher.launch(item.lifecycle, directory, [
                ...item['cmd-args'],
                ...item['npm-args']
              ], JSON.stringify({ remain: item['npm-args'] }));

              try {
                expect(result.all).toStrictEqual(item.result);
              } catch (error) {
                console.log('result (' + directory + '):', JSON.stringify(result.all, null, 2));
                throw error;
              }
            }, 10000);
          }
        });
      }
    });
  }
}
main();

afterAll(() => {
  // console.log('afterAll:', new Date().toISOString());
}, 10000);
