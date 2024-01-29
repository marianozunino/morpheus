import { Command, CommandRunner } from 'nest-commander';
import { ExecutionWrapperService } from './execution-wrapper.service';
import { LazyModuleLoader } from '@nestjs/core';

@Command({
  name: 'create',
  description: 'Create a new migration file',
  arguments: '<migration_name>',
})
export class CreateCommand extends CommandRunner {
  constructor(
    private readonly executionWrapperService: ExecutionWrapperService,
    private readonly lazyLoader: LazyModuleLoader,
  ) {
    super();
  }

  public async run([migrationName]: string[]): Promise<void> {
    const { CliModule, CliService } = await import('@morpheus4j/core');
    const moduleRef = await this.lazyLoader.load(() => CliModule);
    const cliService = moduleRef.get(CliService);

    await this.executionWrapperService.asyncExecutionWrapper(async () => await cliService.generateMigration(migrationName));
  }
}
