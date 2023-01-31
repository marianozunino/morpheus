import { Command, CommandRunner } from 'nest-commander';
import { ExecutionWrapperService } from '../execution-wrapper.service';
import { CliService } from '../cli.service';

@Command({
  name: 'migrate',
  description: 'Execute migrations',
})
export class MigrateCommand extends CommandRunner {
  public constructor(
    private readonly cliService: CliService,
    private readonly executionWrapperService: ExecutionWrapperService,
  ) {
    super();
  }

  async run(): Promise<void> {
    await this.executionWrapperService.asyncExecutionWrapper(
      this.cliService.migrate.bind(this.cliService),
    );
  }
}
