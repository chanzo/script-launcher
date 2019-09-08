import { TestLauncher } from './test-launcher';
import * as path from 'path';

const testFiles = path.join(__dirname, 'configs');
const tempFiles = path.join(__dirname, 'temp');
const readmeFile = path.join(__dirname, '..', 'src', 'README.md');

const testLauncher = new TestLauncher(tempFiles, '', '');

async function main() {
  let index = 0;

  testLauncher.load(testFiles);
  testLauncher.markdown(readmeFile, 'Implementation examples (readme.md)2', [
    'Installation',
    'Usage examples',
    'Motivation',
    'Implementation examples',
    'Launcher files',
    'Script shell',
    'Menu options',
    'Logging'
  ]);

  for (const [name, configs] of testLauncher.configs) {
    describe(name, () => {
      for (const config of configs) {
        const directory = (index++).toString().padStart(4, '0');

        if (config.files === undefined) {
          test.todo(config.name);
          continue;
        }

        testLauncher.create(directory, config.files);

        describe(config.name, () => {
          if (config.tests.length === 0) test.todo('command');

          for (const item of config.tests) {
            if ((item['cmd-args'].length === 0 && item['npm-args'].length === 0) || item.result === undefined) {
              test.todo(item.name);
              continue;
            }

            test(item.name.padEnd(56), async () => {
              const result = await testLauncher.launch(item.lifecycle, directory, [
                ...item['cmd-args'],
                ...item['npm-args']
              ], JSON.stringify({ remain: item['npm-args'] }));

              expect(result.all).toStrictEqual(item.result);
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
