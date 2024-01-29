import { Command, CommandRunner } from 'nest-commander';
import { ExecutionWrapperService } from './execution-wrapper.service';
import { LazyModuleLoader } from '@nestjs/core';

@Command({ name: 'info', description: 'Show current status' })
export class InfoCommand extends CommandRunner {
  constructor(
    private readonly executionWrapperService: ExecutionWrapperService,
    private readonly lazyLoader: LazyModuleLoader,
  ) {
    super();
  }

  public async run(): Promise<void> {
    const { CliModule, CliService } = await import('@morpheus4j/core');
    const moduleRef = await this.lazyLoader.load(() => CliModule);
    const cliService = moduleRef.get(CliService);
    await this.executionWrapperService.asyncExecutionWrapper(cliService.getInfo.bind(cliService));
  }
}
