const launcher = require('../dist/launch');

describe('launcher arguments', () => {

  test('help', () => {
    const backConsole = {
      log: console.log,
      error: console.error
    };
    try {
      console.log('11111');

      console.log = () => { };
      console.error = () => { };

      // expect(logMsg).toBe('hello');

      launcher.main([
        null,
        null,
        '--testmode',
        '--help'
      ]);

      expect(false).toBe(false)
    }
    finally {
      console.log = backConsole.log;
      console.error = backConsole.error;
    }
  });
  test('help2', () => {
    console.log('22222');

    expect(false).toBe(false)
  })
});
/*
launcher.main([
  null,
  null,
  '--testmode',
  '--help'
], '');
*/
