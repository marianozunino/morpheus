import { Command, CommandRunner, Option } from 'nest-commander';
import { LoggerService } from '../../logger.service';
import { CliService } from '../cli.service';
import { ExecutionWrapperService } from '../execution-wrapper.service';

interface CleanCommandOptions {
  dropConstraints?: boolean;
}

@Command({
  name: 'clean',
  description:
    'It will remove Neo4j-Migrations related nodes, relationships and constraints.',
})
export class CleanCommand extends CommandRunner {
  public constructor(
    private readonly cliService: CliService,
    private readonly executionWrapperService: ExecutionWrapperService,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  async run(_args: string[], options: CleanCommandOptions): Promise<void> {
    const { dropConstraints } = options;
    await this.executionWrapperService.asyncExecutionWrapper(
      async () => await this.cliService.clean(dropConstraints),
    );
  }

  @Option({
    flags: '-d, --drop-constraints [boolean]',
    description: 'If set to false, constraints will not be dropped.',
    defaultValue: true,
  })
  parseBoolean(val: string): boolean {
    try {
      return JSON.parse(val);
    } catch (error) {
      this.logger.error(
        `Invalid value for boolean option drop-constraints: ${val}`,
      );
      process.exit(1);
    }
  }
}
