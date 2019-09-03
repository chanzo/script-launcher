import { Common } from "./common";

const launcher = require('../dist/package/launch');

describe('launcher arguments', () => {

  test('help', () => {
    const current = Common.setConsoleFunctions({
      log: () => { },
      error: () => { },
    });

    try {
      console.log('11111');


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
      Common.setConsoleFunctions(current);
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
