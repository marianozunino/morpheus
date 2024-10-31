import {Flags} from '@oclif/core'

import {BaseCommand} from '../base-command'
import {getDatabaseConnection} from '../neo4j/connection'
import {FileService} from '../services/file.service'
import {MigrationService} from '../services/migrate.service'
import {Repository} from '../services/neo4j.repository'
import {TransactionMode} from '../types'

export default class Migrate extends BaseCommand<typeof Migrate> {
  static override aliases = []
  static override description = 'Execute pending database migrations in sequential order'

  static override examples = [
    '<%= config.bin %> migrate',
    '<%= config.bin %> migrate -m ~/path/to/migrations',
    '<%= config.bin %> migrate --config ./custom-config.json',
    '<%= config.bin %> migrate --dry-run',
    '<%= config.bin %> migrate --transaction-mode=PER_STATEMENT',
  ]

  static override flags = {
    ...BaseCommand.flags,
    'dry-run': Flags.boolean({
      default: false,
      description: 'Perform a dry run - no changes will be made to the database',
    }),
    'transaction-mode': Flags.option({
      default: TransactionMode.PER_MIGRATION,
      description: 'Transaction mode',
      options: [TransactionMode.PER_MIGRATION, TransactionMode.PER_STATEMENT],
    })(),
  }

  public async run(): Promise<void> {
    try {
      const {flags} = await this.parse(Migrate)
      const config = this.getConfig()

      const connection = await getDatabaseConnection(config)
      const repository = new Repository(connection)
      const fileService = new FileService(config)

      await new MigrationService(repository, fileService).migrate({
        dryRun: flags['dry-run'],
        transactionMode: flags['transaction-mode'],
      })
      await connection.close()
    } catch (error) {
      this.error(error instanceof Error ? error.message : String(error))
    }
  }
}
