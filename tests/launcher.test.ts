import { TestLauncher } from './test-launcher';
import * as path from 'path';

const testFiles = path.join(__dirname, 'configs'); // , '*.json'
const tempFiles = path.join(__dirname, 'temp'); // , '*.json'

const testLauncher = new TestLauncher(tempFiles, '', '');

async function main() {
  let index = 0;

  testLauncher.load(testFiles); // |Help

  for (const [name, configs] of testLauncher.configs) {
    describe(name, () => {
      for (const config of configs) {
        const directory = (index++).toString().padStart(4, '0');

        testLauncher.create(directory, config.files);

        describe(config.name, () => {
          for (const item of config.tests) {
            const name = ('launch ' + item.command).replace('launch --script=', '').padEnd(32);

            test(name, async () => {
              const result = await testLauncher.launch(directory, [
                item.command
              ]);
              // console.log('result.all:', result.all);
              // console.log('item.result:', item.result);
              expect(result.all).toStrictEqual(item.result);
            });
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
