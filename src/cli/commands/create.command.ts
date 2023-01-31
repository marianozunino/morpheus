import { Command, CommandRunner } from 'nest-commander';
import { CliService } from '../cli.service';
import { ExecutionWrapperService } from '../execution-wrapper.service';

@Command({
  name: 'create',
  description: 'Create a new migration file',
  arguments: '<migration_name>',
})
export class CreateCommand extends CommandRunner {
  public constructor(
    private readonly cliService: CliService,
    private readonly executionWrapperService: ExecutionWrapperService,
  ) {
    super();
  }

  async run([migrationName]: string[]): Promise<void> {
    await this.executionWrapperService.asyncExecutionWrapper(
      async () => await this.cliService.generateMigration(migrationName),
    );
  }
}
