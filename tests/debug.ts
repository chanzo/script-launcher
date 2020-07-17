import { ISpawnOptions, Process } from '../src/spawn-process';
import { ConsoleInterceptor } from './console-interceptor';
import { promisify } from 'util';

/*
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

*/
async function run(command: string): Promise<void> {
  const args: string[] = [];
  const options: ISpawnOptions = {
    shell: true,
    testmode: true
  };

  const spawn = Process.spawn(command, args, options);

  const exitCode = await spawn.wait();

  console.log('exitCode:', exitCode);

  // const exitPromise = new Promise<number>((resolve, reject) => {
  //   console.log('setTimeout:1');
  //   setTimeout(() => {
  //     console.log('setTimeout:2');
  //     resolve();
  //   }, 5000);
  // });

  // await exitPromise;

}

async function main(): Promise<void> {
  try {

    // const interceptor = new ConsoleInterceptor();

    for (let index = 0; index < 2; index++) {
      await run('./out-test.sh ' + index);
    }

    // interceptor.close();

    // console.log(interceptor.all);
  } catch (error) {
    console.log('error:', error);
  }

}

main();
