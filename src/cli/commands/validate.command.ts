import { Command, CommandRunner } from 'nest-commander';
import { CliService } from '../cli.service';
import { ExecutionWrapperService } from '../execution-wrapper.service';

@Command({
  name: 'validate',
  description: 'Validate the current migration state',
})
export class ValidateCommand extends CommandRunner {
  public constructor(
    private readonly cliService: CliService,
    private readonly executionWrapperService: ExecutionWrapperService,
  ) {
    super();
  }

  async run(): Promise<void> {
    await this.executionWrapperService.asyncExecutionWrapper(
      this.cliService.validate,
    );
  }
}
