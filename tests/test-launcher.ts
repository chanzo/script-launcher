import * as launcher from '../src/launch';
import { ConsoleInterceptor, IIntercepted } from './console-interceptor';

export class TestLauncher {
  private readonly defaultArgs: string[];

  constructor(...defaultArgs: string[]) {
    this.defaultArgs = defaultArgs;
  }

  public async launch(processArgv: string[], npmConfigArgv: string = ''): Promise<IIntercepted> {
    const interceptor = new ConsoleInterceptor();

    await launcher.main([...this.defaultArgs, ...processArgv], npmConfigArgv);

    interceptor.close();

    return interceptor;
  }
}
