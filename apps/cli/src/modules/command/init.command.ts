import { Command, CommandRunner, Option } from 'nest-commander';
import { Logger } from '@morpheus4j/core';
import { LazyModuleLoader } from '@nestjs/core';

@Command({ name: 'init', description: 'Create a morpheus file' })
export class InitCommand extends CommandRunner {
  private force = false;

  private readonly logger = new Logger(InitCommand.name);

  constructor(private readonly lazyLoader: LazyModuleLoader) {
    super();
  }

  public async run(): Promise<void> {
    try {
      const { UtilsModule, FsService } = await import('@morpheus4j/core');
      const moduleRef = await this.lazyLoader.load(() => UtilsModule);
      const fsService = moduleRef.get(FsService);
      if (this.force) {
        this.logger.warn('Overwriting existing file');
      }
      fsService.createMorpheusFile({
        force: this.force,
      });
    } catch (e) {
      this.logger.error(e.message);
    }
  }

  @Option({
    description: 'Force the creation of the file',
    flags: '-f, --force',
    defaultValue: false,
    required: false,
  })
  public parseForce(): void {
    this.force = true;
  }
}
