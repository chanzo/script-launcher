import * as launcher from '../src/launch';

launcher.main(process.env.npm_lifecycle_event, process.argv, process.argv.slice(2));
