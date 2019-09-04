import * as launcher from '../src/launch';
import { ConsoleInterceptor } from './common';

describe('launcher arguments', () => {

  test('help', () => {
    const interceptor = new ConsoleInterceptor();

    try {

      // expect(logMsg).toBe('hello');

      launcher.main([
        '',
        '',
        '--testmode',
        '--help'
      ], '');

      expect(false).toBe(false);
    } finally {
      interceptor.close();

      console.log(interceptor.all);
    }
  });

  test('help2', () => {
    console.log('22222');

    expect(false).toBe(false);
  });
});
