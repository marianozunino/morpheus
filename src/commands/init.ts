import {Command, Flags} from '@oclif/core'
import path from 'node:path'

import {MORPHEUS_FILE_NAME} from '../constants'
import {InitService} from '../services/init.service'
import {Logger} from '../services/logger'

export default class Init extends Command {
  static override description = 'Initialize a new Morpheus configuration file with database connection settings'

  static override examples = [
    '<%= config.bin %> init',
    '<%= config.bin %> init --force',
    '<%= config.bin %> init --config ./custom-path/morpheus.json',
    '<%= config.bin %> init --config .config.json --force',
  ]

  static override flags = {
    configFile: Flags.string({
      char: 'c',
      description: 'Path to the morpheus file. ./morpheus.json by default',
    }),
    force: Flags.boolean({
      char: 'f',
      default: false,
      description: 'Overwrite existing configuration file if it exists',
      required: false,
    }),
  }

  protected getConfigFile(configFileByArg?: string): string {
    const configFile = configFileByArg ?? path.join(process.cwd(), MORPHEUS_FILE_NAME)
    return configFile
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(Init)
    const configFile = this.getConfigFile(flags.configFile)

    try {
      new InitService({
        configFile,
        force: flags.force,
      }).createMorpheusFile()
      Logger.info(`Configuration file created successfully: ${configFile}`)
    } catch (error) {
      Logger.error((error as Error).message)
    }
  }
}
