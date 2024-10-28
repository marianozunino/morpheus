import {ensureDirSync, existsSync, writeJSONSync} from 'fs-extra'
import path from 'node:path'

import {DEFAULT_MIGRATIONS_PATH} from '../constants'
import {Neo4jConfig, Neo4jScheme} from '../types'

export type InitOptions = {
  configFile: string
  force?: boolean
}

export class InitService {
  constructor(private readonly options: InitOptions) {}

  public createMorpheusFile(): void {
    if (this.options.force) {
      this.writeConfigFile()
    } else {
      if (existsSync(this.options.configFile)) {
        throw new Error(`Morpheus file already exists: ${this.options.configFile}`)
      }

      this.writeConfigFile()
    }
  }

  private writeConfigFile(): void {
    const defaultConfig: Neo4jConfig = {
      database: 'neo4j',
      host: 'localhost',
      migrationsPath: DEFAULT_MIGRATIONS_PATH,
      password: 'neo4j',
      port: 7687,
      scheme: Neo4jScheme.NEO4J,
      username: 'neo4j',
    }

    ensureDirSync(path.dirname(this.options.configFile))
    writeJSONSync(this.options.configFile, defaultConfig, {spaces: 2})
  }
}
