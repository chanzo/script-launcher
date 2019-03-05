import { Process } from './spawn-process';
import { ExecOptions, SpawnOptions } from 'child_process';

const spawnOptions: SpawnOptions = {
  stdio: 'inherit',
};

const execOptions: ExecOptions = {
};

Process.spawn('sh', ['-c', 'echo hallo'], spawnOptions).wait();
// Process.spawn('pwd', [], options).wait();

// Process.exec('echo hallo', [], execOptions);
// Process.spawn('echo', ['hallo', 'daar'], spawnOptions);
