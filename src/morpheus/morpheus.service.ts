import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '../logger.service';
import { CliService } from '../cli/cli.service';

@Injectable()
export class MorpheusService implements OnModuleInit {
  constructor(
    private readonly cliService: CliService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Executing migrations');
      await this.cliService.migrate();
      this.logger.log('Migration complete');
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
