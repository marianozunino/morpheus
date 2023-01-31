import { Command, CommandRunner, Option } from 'nest-commander';
import { LoggerService } from '../../logger.service';
import { CliService } from '../cli.service';

@Command({ name: 'init', description: 'Create a morpheus file' })
export class InitCommand extends CommandRunner {
  private force = false;

  public constructor(
    private readonly cliService: CliService,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  async run(): Promise<void> {
    try {
      if (this.force) {
        this.logger.warn('Overwriting existing file');
      }
      this.cliService.init({
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
