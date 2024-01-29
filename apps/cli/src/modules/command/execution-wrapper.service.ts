import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ExecutionWrapperService {
  private readonly logger = new Logger('morpheus-cli');
  constructor() {}

  public async asyncExecutionWrapper(
    ...executables: (() => Promise<unknown>)[]
  ): Promise<void> {
    try {
      for (const executable of executables) {
        await executable();
      }
      process.exit(0);
    } catch (error) {
      this.logger.error(error.message);
      process.exit(1);
    }
  }
}
