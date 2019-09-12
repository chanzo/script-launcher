import * as launcher from '../src/launch';

async function main() {
  const npmConfigArgv1 = JSON.stringify(
    {
      remain: [
      ],
      cooked: [
        ''
      ],
      original: [
        ''
      ]
    }
  );
  const npmConfigArgv2 = JSON.stringify(
    {
      remain: []
    }
  );

  await launcher.main(undefined, [
    '', '', '--directory=temp/0016', '--menuTimeout=2' // '--script = deploy: tst'// , '--script = deploy: tst'
  ], npmConfigArgv2
    , true);
}

main();
