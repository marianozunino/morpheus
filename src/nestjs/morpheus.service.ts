import {Injectable} from '@nestjs/common'

import {EnvKeys, MORPHEUS_FILE_NAME} from '../constants'
import {getDatabaseConnection} from '../neo4j/connection'
import {CleanService} from '../services/clean.service'
import {ConfigService} from '../services/config.service'
import {FileService} from '../services/file.service'
import {MigrationService} from '../services/migrate.service'
import {Repository} from '../services/neo4j.repository'
import {Neo4jConfig, Neo4jScheme} from '../types'

@Injectable()
export class MorpheusService {
  /**
   * Cleans the database by removing data and optionally dropping constraints.
   *
   * @param config - Optional configuration object that can include:
   *                 - Standard Neo4j configuration
   *                 - cleanConfig.dropConstraints: Whether to drop database constraints
   *
   * Configuration Resolution (in order of precedence):
   * 1. Provided config parameter (if passed)
   * 2. Environment variables
   * 3. .morpheus.json config file values
   *
   * The method will:
   * - Load and merge configurations from all sources
   * - Validate the final configuration against the Neo4jConfigSchema
   * - Establish a database connection
   * - Execute cleanup operations (optionally including constraint removal)
   * - Automatically close the database connection
   *
   * @throws {Error} If configuration validation fails or cleanup encounters an error
   */
  public async cleanDatabase(config: {cleanConfig?: {dropConstraints?: boolean}} & Neo4jConfig): Promise<void>

  public async cleanDatabase(): Promise<void>

  public async cleanDatabase(config?: {cleanConfig?: {dropConstraints?: boolean}} & Neo4jConfig): Promise<void> {
    const finalConfig = await this.getConfig(config)
    const dropConstraints = Boolean(config?.cleanConfig?.dropConstraints)

    await this.withDatabaseConnection(async (repository) => {
      await new CleanService(repository).clean(dropConstraints)
    }, finalConfig)
  }

  /**
   * Executes database migrations using the merged configuration from config file and environment variables.
   *
   * @param config - Optional explicit configuration that takes highest precedence
   *
   * Configuration Resolution (in order of precedence):
   * 1. Provided config parameter (if passed)
   * 2. Environment variables
   * 3. .morpheus.json config file values
   *
   * The method will:
   * - Load and merge configurations from all sources
   * - Validate the final configuration against the Neo4jConfigSchema
   * - Establish a database connection
   * - Execute pending migrations
   * - Automatically close the database connection
   *
   * @throws {Error} If configuration validation fails or migrations encounter an error
   */
  public async runMigrations(config: Neo4jConfig): Promise<void>
  public async runMigrations(): Promise<void>

  public async runMigrations(config?: Neo4jConfig): Promise<void> {
    const finalConfig = await this.getConfig(config)
    const fileService = new FileService(finalConfig)
    await this.withDatabaseConnection(async (repository) => {
      await new MigrationService(repository, fileService).migrate()
    }, finalConfig)
  }

  private async getConfig(providedConfig?: Neo4jConfig): Promise<Neo4jConfig> {
    if (providedConfig) {
      return providedConfig
    }

    return ConfigService.load(
      {
        database: process.env[EnvKeys.DATABASE],
        host: process.env[EnvKeys.HOST],
        migrationsPath: process.env[EnvKeys.MIGRATIONS_PATH],
        password: process.env[EnvKeys.PASSWORD],
        port: process.env[EnvKeys.PORT] ? Number(process.env[EnvKeys.PORT]) : undefined,
        scheme: process.env[EnvKeys.SCHEME] as Neo4jScheme,
        username: process.env[EnvKeys.USERNAME],
      },
      MORPHEUS_FILE_NAME,
    )
  }

  private async withDatabaseConnection<T>(
    operation: (repository: Repository) => Promise<T>,
    config: Neo4jConfig,
  ): Promise<T> {
    const connection = await getDatabaseConnection(config)
    const repository = new Repository(connection)

    try {
      return await operation(repository)
    } finally {
      await connection.close()
    }
  }
}
