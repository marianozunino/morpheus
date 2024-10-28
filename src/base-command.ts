import {Command, Flags, Interfaces} from '@oclif/core'
import path from 'node:path'

import {DEFAULT_MIGRATIONS_PATH, MORPHEUS_FILE_NAME} from './constants'
import {ConfigService} from './services/config.service'
import {Logger} from './services/logger'
import {AuthFlags, ConfigFlags, ConnectionFlags, DatabaseFlags} from './shared-flags'
import {Neo4jConfig} from './types'

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<(typeof BaseCommand)['baseFlags'] & T['flags']>
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>

export abstract class BaseCommand<T extends typeof Command> extends Command {
  static baseFlags = {
    debug: Flags.boolean({default: false, description: 'Enable debug logging', helpGroup: 'GLOBAL'}),
  }

  static enableJsonFlag = true

  // define flags that can be inherited by any command that extends BaseCommand
  static override flags = {
    ...ConfigFlags,
    ...ConnectionFlags,
    ...AuthFlags,
    ...DatabaseFlags,
  }

  protected args!: Args<T>
  protected flags!: Flags<T>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async catch(err: {exitCode?: number} & Error): Promise<any> {
    // add any custom logic to handle errors from the command
    // or simply return the parent class error handling
    return super.catch(err)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async finally(_: Error | undefined): Promise<any> {
    // called after run and catch regardless of whether or not the command errored
    return super.finally(_)
  }

  protected getConfig(): Neo4jConfig {
    const configFile = this.getConfigFile()

    const config = ConfigService.load(
      {
        database: this.flags.database,
        host: this.flags.host,
        migrationsPath: this.flags.migrationsPath ?? DEFAULT_MIGRATIONS_PATH,
        password: this.flags.password,
        port: this.flags.port,
        scheme: this.flags.scheme,
        username: this.flags.username,
      },
      configFile,
    )
    return config
  }

  protected getConfigFile(): string {
    const configFile = this.flags.configFile ?? path.join(process.cwd(), MORPHEUS_FILE_NAME)
    return configFile
  }

  public async init(): Promise<void> {
    await super.init()
    const {args, flags} = await this.parse({
      args: this.ctor.args,
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      enableJsonFlag: this.ctor.enableJsonFlag,
      flags: this.ctor.flags,
      strict: this.ctor.strict,
    })
    this.flags = flags as Flags<T>
    this.args = args as Args<T>

    Logger.initialize(flags.json, flags.debug)
  }
}
