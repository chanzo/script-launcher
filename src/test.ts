import { Process } from './spawn-process';
import { ExecOptions, SpawnOptions } from 'child_process';
// import * as crossEnv from 'cross-env';
import * as spawn from 'cross-spawn';

// const crossEnv = require('cross-env');

// crossEnv(process.argv.slice(2), { shell: true });

const spawnOptions: SpawnOptions = {
  stdio: 'inherit',
  shell: true,
};

const execOptions: ExecOptions = {
};

// Process.spawn('sh', ['-c', 'echo hallo'], spawnOptions).wait();
// Process.spawn('pwd', [], options).wait();

// Process.exec('echo hallo', [], execOptions);
// Process.spawn('echo', ['hallo', 'daar'], spawnOptions);

// Process.spawn('echo', ['hallo'], spawnOptions);

// const command = process.argv.slice(2);
// console.log('command: ', command);

// spawn(parsed[1], [], spawnOptions);

// crossEnv(command, { shell: true });

// Process.spawn('../node_modules/.bin/cross-env-shell', ['echo', 'hallo 1', '&&', 'echo', 'hallo 2', '&&', 'echo', '$0'], {
//   stdio: 'inherit',
//   shell: 'bash',
// });
Process.spawn('echo test', ['echo', 'hallo 1', '&&', 'echo', 'hallo 2', '&&', 'echo', '$0'], {
  stdio: 'inherit',
  shell: '/bin/bash',
});

/*
Process.spawn('../node_modules/.bin/cross-env-shell', ['echo', 'hallo 1', '&&', 'echo', 'hallo 2'], {
  stdio: 'inherit',
  //shell: true,
});
*/
/*
Process.spawn('echo hallo 1 && echo hallo 2', [], {
  stdio: 'inherit',
  shell: true,
});
*/
