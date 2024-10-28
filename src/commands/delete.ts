import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../base-command'
import {getDatabaseConnection} from '../neo4j/connection'
import {DeleteService} from '../services/delete.service'
import {FileService} from '../services/file.service'
import {Repository} from '../services/neo4j.repository'

export default class Delete extends BaseCommand<typeof Delete> {
  static override args = {
    version: Args.string({
      description: 'The version that should be deleted',
      name: 'version',
      required: true,
    }),
  }

  static override description = `Delete a migration from the database.

  This command can be used to repair broken migration chains. If you accidentally deleted a migration file, you can use this command to find the previous migration and delete it.`

  static override examples = [
    '<%= config.bin %> delete 1.0.0',
    '<%= config.bin %> delete 1.2.3 --config ./custom-config.json',
    '<%= config.bin %> delete 1.4.0 --dry-run',
  ]

  static override flags = {
    ...BaseCommand.flags,
    'dry-run': Flags.boolean({
      default: false,
      description: 'Perform a dry run - no changes will be made to the database',
    }),
  }

  public async run(): Promise<void> {
    try {
      const config = this.getConfig()

      const {args, flags} = await this.parse(Delete)

      const connection = await getDatabaseConnection(config)
      const fileService = new FileService(config)
      const repository = new Repository(connection)

      await new DeleteService(repository, fileService).delete(args.version, {
        dryRun: flags['dry-run'],
      })
      await connection.close()
    } catch (error) {
      this.error(error instanceof Error ? error.message : String(error))
    }
  }
}
