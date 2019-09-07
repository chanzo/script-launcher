import * as launcher from '../src/launch';

async function main() {
  await launcher.main(['', '', '--directory=temp/0000', '--script=sequential-scripts'], '', true);
}

main();
