import { TestLauncher } from './test-launcher';

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
  '  ansi=        Enable or disable ansi color output.'
];

const testLauncher = new TestLauncher('', '', '--testmode');

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

});

// describe('Simple config', () => {
//   // launch --config=./tests/configs/launcher-config.json build-stuff
//   test('array', async () => {
//     const result = await testLauncher.launch(['--help']);

//     expect(result.all).toStrictEqual(helpResult);
//   });
// });
