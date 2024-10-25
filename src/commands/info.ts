import {BaseCommand} from '../base-command'
import {getDatabaseConnection} from '../neo4j/connection'
import {FileService} from '../services/file.service'
import {InfoService} from '../services/info.service'
import {Repository} from '../services/neo4j.repository'

export default class Info extends BaseCommand<typeof Info> {
  static override description = `Info up migration-related database objects

  Removes all Morpheus migration metadata including nodes, relationships, and optionally constraints.
  Use with caution as this will reset the migration history.`

  static override examples = ['<%= config.bin %> info', '<%= config.bin %> info --config ./custom-config.json']

  public async run(): Promise<void> {
    try {
      const config = this.getConfig()

      const connection = await getDatabaseConnection(config)
      const fileService = new FileService(config)
      const repository = new Repository(connection)

      await new InfoService(repository, fileService).getInfo()
      await connection.close()
    } catch (error) {
      this.error(error instanceof Error ? error.message : String(error))
    }
  }
}
