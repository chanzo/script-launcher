import { TestLauncher } from './test-launcher';
import * as fs from 'fs';
import * as path from 'path';

const helpResult = [
  'Usage: launch [command] [options...]',
  '',
  'Commands:',
  '  \u001b[36minit         \u001b[0mCreate starter config files.',
  '  \u001b[36mhelp         \u001b[0mShow this help.',
  '  \u001b[36mmenu         \u001b[0mShow interactive menu.',
  '  \u001b[36mversion      \u001b[0mOutputs launcher version.',
  '',
  'Options:',
  '  \u001b[36minteractive  \u001b[0mForce to show menu the by ignoring the options value of defaultScript.',
  '  \u001b[36mlogLevel=    \u001b[0mSet log level.',
  '  \u001b[36mconfig=      \u001b[0mMerge in an extra config file.',
  '  \u001b[36mscript=      \u001b[0mLauncher script to start.',
  '  \u001b[36mansi=        \u001b[0mEnable or disable ansi color output.'
];

const helpResultNoAnsi = [
  'Usage: launch [command] [options...]',
  '',
  'Commands:',
  '  init         Create starter config files.',
  '  help         Show this help.',
  '  menu         Show interactive menu.',
  '  version      Outputs launcher version.',
  '',
  'Options:',
  '  interactive  Force to show menu the by ignoring the options value of defaultScript.',
  '  logLevel=    Set log level.',
  '  config=      Merge in an extra config file.',
  '  script=      Launcher script to start.',
  '  ansi=        Enable or disable ansi color output.'
];
const sequentialScripts = [
  'Build step 1',
  'Build step 2',
  'Build step 3'
];
const changeDirectory = ['bin\t\t  executor.js\t  LICENSE\tREADME.md\ncommon.js\t  launch.js\t  logger.js\tscripts.js\nconfig-loader.js  launch-menu.js  package.json\tspawn-process.js'];

const parametersAndFunctions1 = [
  'ng serve uva -c=dev'
];
const parametersAndFunctions2 = [
  'ng serve uva -c=tst'
];
const parametersAndFunctions3 = [
  'ng serve hva -c=prd'
];

const testFiles = path.join(__dirname, 'configs'); // , '*.json'
const tempFiles = path.join(__dirname, 'temp'); // , '*.json'
const testLauncher = new TestLauncher(tempFiles, testFiles, '', '', '--testmode');
/*
describe('Launcher commands', () => {

  test('help', async () => {
    const result = await testLauncher.launch(['--help']);

    expect(result.all).toStrictEqual(helpResult);
  });
  test('help no ansi', async () => {
    const result = await testLauncher.launch(['--help', '--ansi=false']);

    expect(result.all).toStrictEqual(helpResultNoAnsi);
  });

  test('version', async () => {
    const result = await testLauncher.launch(['--version']);

    expect(result.all).toStrictEqual(['1.16.2']);
  });

  test('array', async () => {
    const result = await testLauncher.launch(['--help']);

    // console.log('result:', result.all);

    expect(result.all).toStrictEqual(helpResultNoAnsi);
  });
});
*/


async function main() {
  const configGroups = testLauncher.load();

  for (const [name, configs] of Object.entries(configGroups)) {
    describe(name, () => {
      // console.log('d1', new Date().toISOString());
      for (const config of configs) {
        const id = config.name.toLowerCase().replace(/ /, '-');

        testLauncher.create(id, config.files);

        for (const item of config.tests) {
          test(config.name + ' (' + item.command + ')', async () => {
            const result = await testLauncher.launch(id, [
              '--script=' + item.command
            ]);
            // console.log('result.all:', result.all);
            // console.log('item.result:', item.result);
            expect(result.all).toStrictEqual(item.result);
            // expect(true).toStrictEqual(true);
          });
        }
        // expect(result.all).toStrictEqual(sequentialScripts);
      }
      // console.log('d2', new Date().toISOString());
    });


  }
}

// describe('Simple config', () => {
//   test('Sequential scripts', async () => {
//     const result = await testLauncher.launch([
//       '--config=./tests/configs/launcher-config.json',
//       '--script=sequential-scripts'
//     ]);

//     expect(result.all).toStrictEqual(sequentialScripts);
//   });

//   test('Change directory', async () => {
//     const result = await testLauncher.launch([
//       '--config=./tests/configs/launcher-config.json',
//       '--script=change-directory'
//     ]);

//     expect(result.all).toStrictEqual(changeDirectory);
//   });

//   test('Parameters and functions', async () => {
//     const result = await testLauncher.launch([
//       '--config=./tests/configs/launcher-config.json',
//       '--script=parameters-and-functions'
//     ]);

//     expect(result.all).toStrictEqual(parametersAndFunctions1);
//   });

//   test('Parameters and functions', async () => {
//     const result = await testLauncher.launch([
//       '--config=./tests/configs/launcher-config.json',
//       '--script=parameters-and-functions::tst'
//     ]);

//     expect(result.all).toStrictEqual(parametersAndFunctions2);
//   });

//   test('Parameters and functions', async () => {
//     const result = await testLauncher.launch([
//       '--config=./tests/configs/launcher-config.json',
//       '--script=parameters-and-functions:hva:prd'
//     ]);

//     expect(result.all).toStrictEqual(parametersAndFunctions3);
//   });


// });
main();
