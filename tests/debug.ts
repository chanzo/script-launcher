import * as launcher from '../src/launch';
import { ConsoleInterceptor } from './console-interceptor';
import { format } from 'util';

const interceptor = new ConsoleInterceptor();

// launcher.main([
//   '',
//   '',
//   '--testmode',
//   '--help'
// ], '');

console.log('hallo1', 10, 20);
console.log('hallo2');

interceptor.close();
