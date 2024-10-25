import {BaseCommand} from '../base-command'
import {getDatabaseConnection} from '../neo4j/connection'
import {FileService} from '../services/file.service'
import {MigrationService} from '../services/migrate.service'
import {Repository} from '../services/neo4j.repository'

export default class Migrate extends BaseCommand<typeof Migrate> {
  static override aliases = []
  static override description = 'Execute pending database migrations in sequential order'

  static override examples = [
    '<%= config.bin %> migrate',
    '<%= config.bin %> migrate -m ~/path/to/migrations',
    '<%= config.bin %> migrate --config ./custom-config.json',
  ]

  public async run(): Promise<void> {
    try {
      const config = this.getConfig()

      const connection = await getDatabaseConnection(config)
      const repository = new Repository(connection)
      const fileService = new FileService(config)

      await new MigrationService(repository, fileService).migrate()
      await connection.close()
    } catch (error) {
      this.error(error instanceof Error ? error.message : String(error))
    }
  }
}
