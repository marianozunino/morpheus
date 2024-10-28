/* eslint-disable no-await-in-loop */

import {BASELINE} from '../constants'
import {MigrationError} from '../errors'
import {MigrationInfo, Neo4jMigrationNode} from '../types'
import {FileService} from './file.service'
import {Logger} from './logger'
import {Repository} from './neo4j.repository'
import {generateChecksum} from './utils'

export class MigrationService {
  private latestVersion?: string

  constructor(
    private readonly repository: Repository,
    private readonly fileService: FileService,
  ) {}

  async migrate(dryRun = false): Promise<void> {
    try {
      let state = await this.repository.getMigrationState()

      if (!state.baselineExists) {
        await this.initializeDatabase()
        // Re-fetch state
        state = await this.repository.getMigrationState()
      }

      this.latestVersion = state.latestMigration?.version
      await this.validateMigrations(state.appliedMigrations)

      const pendingMigrations = await this.getPendingMigrations()
      if (pendingMigrations.length === 0) {
        Logger.info('Database is up to date')
        return
      }

      await (dryRun ? this.previewMigrations(pendingMigrations) : this.applyMigrations(pendingMigrations))
    } catch (error) {
      throw new MigrationError(`Migration failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private async applyMigrations(fileNames: string[]): Promise<void> {
    for (const fileName of fileNames) {
      const migration = await this.fileService.prepareMigration(fileName)
      Logger.info(`Executing migration: ${fileName}`)

      const startTime = Date.now()

      // Use the new executeQueries method
      await this.repository.executeQueries(migration.statements.map((statement) => ({statement})))

      const duration = Date.now() - startTime

      const migrationNode: Neo4jMigrationNode = {
        checksum: generateChecksum(migration.statements),
        description: migration.description,
        source: fileName,
        type: 'CYPHER',
        version: migration.version,
      }

      await this.repository.applyMigration(migrationNode, this.latestVersion!, duration)
      this.latestVersion = migration.version
    }
  }

  private async getPendingMigrations(): Promise<string[]> {
    const files = await this.fileService.getFileNamesFromMigrationsFolder()
    return files
      .filter((fileName) => {
        const version = this.fileService.getMigrationVersionFromFileName(fileName)
        return this.latestVersion === BASELINE || this.fileService.compareVersions(version, this.latestVersion!) > 0
      })
      .sort((a, b) => this.fileService.compareVersions(a, b))
  }

  private async initializeDatabase(): Promise<void> {
    // Initialize schema first
    await this.repository.initializeSchema()

    // Then create baseline node
    await this.repository.initializeBaseline()

    Logger.info('Initialized database with schema and baseline')
  }

  private async previewMigrations(fileNames: string[]): Promise<void> {
    Logger.info('Dry run - no changes will be made to the database')

    for (const fileName of fileNames) {
      const migration = await this.fileService.prepareMigration(fileName)
      Logger.info(`Would execute migration: ${fileName}`)
      Logger.info('Statements:')
      for (const stmt of migration.statements) {
        Logger.info(stmt)
      }
    }

    Logger.info(`Dry run complete - ${fileNames.length} migration(s) pending`)
  }

  private async validateMigrations(migrations: MigrationInfo[]): Promise<void> {
    for (const migration of migrations) {
      const {statements} = await this.fileService.prepareMigration(migration.node.source)
      const currentChecksum = generateChecksum(statements)

      if (currentChecksum !== migration.node.checksum) {
        throw new MigrationError(
          `Checksum mismatch for ${migration.node.source}. ` +
            'The migration file has been modified after it was applied.',
        )
      }
    }
  }
}
