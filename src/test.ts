import { Process } from './spawn-process';
import { ExecOptions, SpawnOptions } from 'child_process';

const spawnOptions: SpawnOptions = {
  stdio: 'inherit',
};

const execOptions: ExecOptions = {
};

// Process.spawn('sh', ['-c', 'cd src'], spawnOptions).wait();
// Process.spawn('pwd', [], options).wait();

Process.exec('echo hallo', [], execOptions);
