import * as launcher from '../src/launch';

async function main() {
  const npmConfigArgv = JSON.stringify(
    {
      remain: [
        ''
      ],
      cooked: [
        ''
      ],
      original: [
        ''
      ]
    }
  );

  await launcher.main(undefined, [
    '', '', '--directory=temp/0016' // '--script=deploy:tst'// , '--script=deploy:tst'
  ], undefined
    , true);
}

main();
