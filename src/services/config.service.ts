import {pathExistsSync, readJsonSync} from 'fs-extra'
import {z} from 'zod'

import {Neo4jConfig, Neo4jConfigSchema} from '../types'

export class ConfigService {
  static load(flags: Partial<Neo4jConfig>, configFilePath: string): Neo4jConfig {
    try {
      const fileConfig = this.readConfigFile(configFilePath)
      const mergedConfig = this.mergeConfigs(fileConfig, flags)
      return Neo4jConfigSchema.parse(mergedConfig)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n')
        throw new Error(`Configuration validation failed:\n${issues}`)
      }

      throw error
    }
  }

  static loadWithOutValidation(flags: Partial<Neo4jConfig>, configFilePath: string): Neo4jConfig {
    const fileConfig = this.readConfigFile(configFilePath)
    const mergedConfig = this.mergeConfigs(fileConfig, flags)
    return mergedConfig as Neo4jConfig
  }

  private static mergeConfigs(fileConfig: Partial<Neo4jConfig>, envVars: Partial<Neo4jConfig>): Partial<Neo4jConfig> {
    return {
      ...fileConfig,
      ...Object.fromEntries(Object.entries(envVars).filter(([_, value]) => value !== undefined)),
    }
  }

  private static readConfigFile(configFilePath: string): Partial<Neo4jConfig> {
    try {
      return pathExistsSync(configFilePath) ? readJsonSync(configFilePath) : {}
    } catch (error) {
      throw new Error(`Failed to read config file: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
