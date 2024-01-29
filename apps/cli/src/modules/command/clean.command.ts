import { Command, CommandRunner, Option } from 'nest-commander';
import { ExecutionWrapperService } from './execution-wrapper.service';
import { Logger } from '@morpheus4j/core';
import { LazyModuleLoader } from '@nestjs/core';

interface CleanCommandOptions {
  dropConstraints?: boolean;
}

@Command({
  name: 'clean',
  description: 'It will remove Neo4j-Migrations related nodes, relationships and constraints.',
})
export class CleanCommand extends CommandRunner {
  private readonly logger = new Logger(CleanCommand.name);
  constructor(
    private readonly lazyLoader: LazyModuleLoader,
    private readonly executionWrapperService: ExecutionWrapperService,
  ) {
    super();
  }

  public async run(_args: string[], options: CleanCommandOptions): Promise<void> {
    const { CliModule, CliService } = await import('@morpheus4j/core');
    const moduleRef = await this.lazyLoader.load(() => CliModule);
    const cliService = moduleRef.get(CliService);

    const { dropConstraints } = options;
    await this.executionWrapperService.asyncExecutionWrapper(async () => {
      await cliService.clean(dropConstraints);
    });
  }

  @Option({
    flags: '-d, --drop-constraints [boolean]',
    description: 'If set to false, constraints will not be dropped.',
    defaultValue: true,
  })
  public parseBoolean(val: string): boolean {
    try {
      return JSON.parse(val);
    } catch (error) {
      this.logger.error(`Invalid value for boolean option drop-constraints: ${val}`);
      process.exit(1);
    }
  }
}
