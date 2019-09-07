import * as launcher from '../src/launch';

async function main() {
  await launcher.main('start', [
    '', '', '--directory=temp/0008', '--script=deploy:tst', '11', '22', '33'// , '--script=deploy:tst'
  ], JSON.stringify(
    {
      remain: [
        'deploy:tst', '11', '22', '33'
      ],
      cooked: [
        'start', 'deploy:tst', '11', '22', '33'
      ],
      original: [
        'start', 'deploy:tst', '11', '22', '33'
      ]
    }
  )
    , true);
}

main();
