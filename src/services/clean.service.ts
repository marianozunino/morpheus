import {Logger} from './logger'
import {Repository} from './neo4j.repository'

export class CleanService {
  private readonly logger: Logger = new Logger()
  constructor(private readonly repository: Repository) {}

  async clean(dropConstraints: boolean): Promise<void> {
    await this.repository.dropChain()
    this.logger.success('Dropped chain')

    if (dropConstraints) {
      await this.repository.dropConstraints()
      this.logger.success('Dropped constraints')
    }
  }
}
