import * as launcher from '../src/launch';
import { ConsoleInterceptor, IIntercepted } from './console-interceptor';
import { promisify } from 'util';

async function launch(lifecycle: string, directory: string, cmdArgs: string[], npmArgs: string[]): Promise<void> {
  return await launcher.main(lifecycle, ['', '', '--logLevel=0', '--directory=' + directory, ...cmdArgs, ...npmArgs], JSON.stringify({ remain: npmArgs }), true);
}

function NewInterceptor(intercept: boolean): ConsoleInterceptor {
  if (intercept) return new ConsoleInterceptor(['\u001b[?25l']);

  return {
    close: () => {
      // dummy
    },
    log: [],
    debug: [],
    info: [],
    error: [],
    trace: [],
    warn: [],
    all: []
  } as any;
}

async function test0001(intercept: boolean = true): Promise<{ result: string[]; intercepted: IIntercepted }> {
  const result = ['ng build --configuration=production --deploy-url example.prd.com'];
  const interceptor = NewInterceptor(intercept);

  try {
    await launch('start', 'tests/temp/0001', [], ['build:production']);
  } finally {
    interceptor.close();
  }

  return {
    result: result,
    intercepted: interceptor
  };
}

async function test0002(intercept: boolean = true): Promise<{ result: string[]; intercepted: IIntercepted }> {
  const result = ['Argument 1 : data1', 'Argument 2 : data2', 'Argument 3 :'];
  const interceptor = NewInterceptor(intercept);

  try {
    await launch('start', 'tests/temp/0002', [], ['build-stuff', 'data1', 'data2']);
  } finally {
    interceptor.close();
  }

  return {
    result: result,
    intercepted: interceptor
  };
}

async function test0017(intercept: boolean = true): Promise<{ result: string[]; intercepted: IIntercepted }> {
  const result = [
    '',
    '\u001b[32m?\u001b[39m \u001b[1mSelect organization:\u001b[22m\u001b[0m \u001b[0m\u001b[2m(Use arrow keys)\u001b[22m\n  uva \n  \u001b[2m──────────────\u001b[22m\n\u001b[36m❯ hva\u001b[39m ',
    '\u001b[6D',
    '\u001b[6C',
    '\u001b[s',
    '',
    '',
    '\u001b[1mAuto select in: \u001b[0m1',
    '\u001b[u',
    '',
    '',
    'Start development server',
    'ng serve hva -c=dev'
  ];

  const interceptor = NewInterceptor(intercept);

  try {
    await launch('start', 'tests/temp/0017', [], []);
    // await promisify(setImmediate)(); // Proccess all events in event queue, to flush the out streams.
    // await promisify(setTimeout)(10);
    // await promisify(setImmediate)();
  } finally {
    interceptor.close();
  }

  return {
    result: result,
    intercepted: interceptor
  };
}

async function test0018(intercept: boolean = true): Promise<{ result: string[]; intercepted: IIntercepted }> {
  const result = [
    '',
    '\u001b[32m?\u001b[39m \u001b[1mSelect organization:\u001b[22m\u001b[0m \u001b[0m\u001b[2m(Use arrow keys)\u001b[22m\n  uva \n  \u001b[2m──────────────\u001b[22m\n\u001b[36m❯ hva\u001b[39m ',
    '\u001b[6D',
    '\u001b[6C',
    '\u001b[s',
    '',
    '',
    '\u001b[1mAuto select in: \u001b[0m1',
    '\u001b[u',
    '',
    '',
    'Start development server',
    'ng serve hva -c=dev'
  ];

  const interceptor = NewInterceptor(intercept);

  try {
    await launch('start', 'tests/temp/0018', [], ['menu']);
    // await promisify(setImmediate)(); // Proccess all events in event queue, to flush the out streams.
    // await promisify(setTimeout)(10);
    // await promisify(setImmediate)();
  } finally {
    interceptor.close();
  }

  return {
    result: result,
    intercepted: interceptor
  };
}

async function main(): Promise<void> {
  describe('debug', () => {
    for (let index = 0; index < 10; index++) {
      test('test0001-' + index, async () => {
        const result = await test0001();

        try {
          expect(result.intercepted.all).toStrictEqual(result.result);
        } catch (error) {
          console.log(result.intercepted.all);
          throw error;
        }
      });
      test('test0002-' + index, async () => {
        const result = await test0002();

        try {
          expect(result.intercepted.all).toStrictEqual(result.result);
        } catch (error) {
          console.log(result.intercepted.all);
          throw error;
        }
      });
      test('test0018-' + index, async () => {
        console.log(index, '', new Date().toISOString());

        const result = await test0018();

        expect(result.intercepted.all).toStrictEqual(result.result);
      });
    }
  });
  // console.log('intercepted:', result.intercepted.all);
}

// npx jest ./tests/debug.test.ts
test('dummy', async () => {
  expect(true).toBe(true);
});

// main();
// menuTest0018(false);

// afterEach(() => {
//   // sentry.uninstall()
//   global.process.removeAllListeners('unhandledRejection');
//   process.removeAllListeners('unhandledRejection');
// })

// afterAll(() => {
//   console.log('\u001b[?25h');
// });
