import {Logger} from './logger'
import {Repository} from './neo4j.repository'

export class CleanService {
  constructor(private readonly repository: Repository) {}

  async clean(dropConstraints = false): Promise<void> {
    try {
      if (dropConstraints) {
        // Drop constraints first if requested
        await this.repository.cleanConstraints()
        Logger.info('Successfully dropped Moprheus constraints and indices')
      }

      await this.repository.cleanMigrations()
      Logger.info('Successfully dropped migration chain')
    } catch (error) {
      const operation = dropConstraints ? 'clean and drop constraints' : 'clean'
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to ${operation}: ${message}`)
    }
  }
}
