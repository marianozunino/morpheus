import { Command, CommandRunner } from 'nest-commander';
import { ExecutionWrapperService } from './execution-wrapper.service';
import { LazyModuleLoader } from '@nestjs/core';

@Command({
  name: 'validate',
  description: 'Validate the current migration state',
})
export class ValidateCommand extends CommandRunner {
  constructor(
    private readonly lazyLoader: LazyModuleLoader,
    private readonly executionWrapperService: ExecutionWrapperService,
  ) {
    super();
  }

  public async run(): Promise<void> {
    const { CliModule, CliService } = await import('@morpheus4j/core');
    const moduleRef = await this.lazyLoader.load(() => CliModule);
    const cliService = moduleRef.get(CliService);

    await this.executionWrapperService.asyncExecutionWrapper(cliService.validate.bind(cliService));
  }
}
