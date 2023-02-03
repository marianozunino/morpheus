import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger.service';

@Injectable()
export class ExecutionWrapperService {
  public constructor(private readonly logger: LoggerService) {}

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
