import { Command, CommandRunner } from 'nest-commander';
import { CliService } from '../cli.service';
import { ExecutionWrapperService } from '../execution-wrapper.service';

@Command({ name: 'info', description: 'Show current status' })
export class InfoCommand extends CommandRunner {
  public constructor(
    private readonly cliService: CliService,
    private readonly executionWrapperService: ExecutionWrapperService,
  ) {
    super();
  }

  async run(): Promise<void> {
    await this.executionWrapperService.asyncExecutionWrapper(
      this.cliService.getInfo.bind(this.cliService),
    );
  }
}
