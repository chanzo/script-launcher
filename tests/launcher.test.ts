import { TestLauncher } from './test-launcher';
import * as path from 'path';

const testFiles = path.join(__dirname, 'configs'); // , '*.json'
const tempFiles = path.join(__dirname, 'temp'); // , '*.json'

const testLauncher = new TestLauncher(tempFiles, '', '');

async function main() {
  let index = 0;

  // testLauncher.load(testFiles, 'Reference scripts|Environment and command line argument values'); // , 'Reference scripts'
  testLauncher.load(testFiles, ''); // , 'Reference scripts'

  for (const [name, configs] of testLauncher.configs) {
    describe(name, () => {
      for (const config of configs) {
        const directory = (index++).toString().padStart(4, '0');

        testLauncher.create(directory, config.files);

        describe(config.name, () => {
          if (config.tests.length === 0) test.todo('command');

          for (const item of config.tests) {
            if ((item['cmd-args'].length > 0 || item['npm-args'].length > 0) && item.result !== undefined) {
              test(item.name.padEnd(48), async () => {
                const result = await testLauncher.launch(item.lifecycle, directory, [
                  ...item['cmd-args'],
                  ...item['npm-args']
                ], JSON.stringify({ remain: item['npm-args'] }));

                // console.log('result.all:', result.all);
                // console.log('item.result:', item.result);
                expect(result.all).toStrictEqual(item.result);
              }, 10000);
            } else {
              test.todo(item.name);
            }
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
