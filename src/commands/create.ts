import {Args, Command} from '@oclif/core'
import path from 'node:path'

import {MORPHEUS_FILE_NAME} from '../constants'
import {ConfigService} from '../services/config.service'
import {CreateService} from '../services/create.service'
import {Logger} from '../services/logger'
import {ConfigFlags} from '../shared-flags'

export default class Create extends Command {
  static override args = {
    name: Args.string({
      description: 'Name of the migration (will be prefixed with a semver number)',
      name: 'name',
      required: true,
    }),
  }

  static override description = 'Generate a new timestamped migration file with boilerplate code'

  static enableJsonFlag = true

  static override examples = [
    '<%= config.bin %> create add-user-nodes',
    '<%= config.bin %> create update-relationships -m ~/path/to/migrations',
    '<%= config.bin %> create update-relationships --config ./custom-config.json',
  ]

  static override flags = {
    ...ConfigFlags,
  }

  protected getConfigFile(configFileByArg?: string): string {
    const configFile = configFileByArg ?? path.join(process.cwd(), MORPHEUS_FILE_NAME)
    return configFile
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Create)

    Logger.initialize(flags.json, flags.debug)

    try {
      const configFile = this.getConfigFile(flags.configFile)
      const config = ConfigService.loadWithOutValidation(flags, configFile)
      await new CreateService(config).generateMigration(args.name)
    } catch (error) {
      this.error(error instanceof Error ? error.message : String(error))
    }
  }
}
