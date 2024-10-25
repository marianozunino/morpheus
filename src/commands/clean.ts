import {Flags} from '@oclif/core'

import {BaseCommand} from '../base-command'
import {getDatabaseConnection} from '../neo4j/connection'
import {CleanService} from '../services/clean.service'
import {Repository} from '../services/neo4j.repository'

export default class Clean extends BaseCommand<typeof Clean> {
  static override description = `Clean up migration-related database objects

  Removes all Morpheus migration metadata including nodes, relationships, and optionally constraints.
  Use with caution as this will reset the migration history.`

  static override examples = [
    '<%= config.bin %> clean',
    '<%= config.bin %> clean --drop-constraints',
    '<%= config.bin %> clean --config ./custom-config.json',
  ]

  static flags = {
    'drop-constraints': Flags.boolean({
      default: false,
      description: 'Additionally remove all Morpheus-related database constraints',
    }),
    ...BaseCommand.flags,
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(Clean)

    try {
      const config = this.getConfig()

      const connection = await getDatabaseConnection(config)
      const repository = new Repository(connection)

      await new CleanService(repository).clean(flags['drop-constraints'])
      await connection.close()
    } catch (error) {
      this.error(error instanceof Error ? error.message : String(error))
    }
  }
}
