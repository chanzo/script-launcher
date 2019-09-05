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
const arrayOutput = [
  'Build step 1',
  'Build step 2',
  'Build step 3'
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

  test('array', async () => {
    const result = await testLauncher.launch(['--help']);

    // console.log('result:', result.all);

    expect(result.all).toStrictEqual(helpResultNoAnsi);
  });
});

describe('Simple config', () => {
  // launch --config=./tests/configs/launcher-config.json --script=build-stuff
  test('array2', async () => {
    const result = await testLauncher.launch([
      '--config=./tests/configs/launcher-config.json',
      '--script=build-stuff'
    ]);

    console.log('result:', result.all);

    // expect(result.all).toStrictEqual(arrayOutput);
  });
});
