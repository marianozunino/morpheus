import {Transaction} from 'neo4j-driver'

import {BASELINE} from '../constants'
import {MigrationError} from '../errors'
import {Neo4jMigrationNode} from '../types'
import {FileService} from './file.service'
import {Logger} from './logger'
import {Repository} from './neo4j.repository'
import {generateChecksum} from './utils'

export class MigrationService {
  private latestAppliedVersion?: string
  private readonly logger = new Logger()

  constructor(
    private readonly repository: Repository,
    private readonly fileService: FileService,
  ) {}

  public async migrate(): Promise<void> {
    try {
      await this.initializeMigration()
      const pendingMigrations = await this.getPendingMigrations()

      if (pendingMigrations.length === 0) {
        this.logger.success('Database is up to date')
        return
      }

      for (const fileName of pendingMigrations) {
        // eslint-disable-next-line no-await-in-loop
        await this.applyMigration(fileName)
      }
    } catch (error) {
      throw new MigrationError(`Migration failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private async applyMigration(fileName: string): Promise<void> {
    const migration = await this.fileService.prepareMigration(fileName)
    this.logger.success(`Executing migration: ${fileName}`)

    const trx = this.repository.getTransaction()

    try {
      const duration = await this.executeMigrationStatements(migration.statements, trx)
      await trx.commit()

      const migrationNode: Neo4jMigrationNode = {
        checksum: generateChecksum(migration.statements),
        description: migration.description,
        source: fileName,
        type: 'CYPHER',
        version: migration.version,
      }

      await this.saveMigrationNode(migrationNode, duration)
      this.latestAppliedVersion = migration.version
    } catch (error) {
      await trx.rollback()
      throw new MigrationError(
        `Failed to apply migration ${fileName}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private async assertBaseNodeExists(): Promise<void> {
    const baseNodeExists = await this.repository.fetchBaselineNode()
    if (!baseNodeExists) {
      await this.repository.createConstraints()
      await this.repository.createBaseNode()
    }
  }

  private async executeMigrationStatements(statements: string[], trx: Transaction): Promise<number> {
    const startTime = Date.now()
    for (const statement of statements) {
      // eslint-disable-next-line no-await-in-loop
      await this.repository.executeQuery(statement, trx)
    }

    return Date.now() - startTime
  }

  private async getPendingMigrations(): Promise<string[]> {
    const fileNames = await this.fileService.getFileNamesFromMigrationsFolder()
    return fileNames
      .filter((fileName) => this.isMigrationPending(fileName))
      .sort((a, b) => this.fileService.compareVersions(a, b))
  }

  private async initializeMigration(): Promise<void> {
    await this.assertBaseNodeExists()
    await this.setLatestAppliedVersion()
    await this.validateMigrationsIntegrity()
  }

  private isMigrationPending(fileName: string): boolean {
    const version = this.fileService.getMigrationVersionFromFileName(fileName)
    return (
      this.latestAppliedVersion === BASELINE ||
      this.fileService.compareVersions(version, this.latestAppliedVersion!) > 0
    )
  }

  private async isValidChecksum(fileName: string, previousChecksum: string): Promise<boolean> {
    const {statements} = await this.fileService.prepareMigration(fileName)
    return previousChecksum === generateChecksum(statements)
  }

  private async saveMigrationNode(migrationNode: Neo4jMigrationNode, duration: number): Promise<void> {
    const migrationQuery = this.repository.buildMigrationQuery(migrationNode, this.latestAppliedVersion!, duration)
    await this.repository.executeQuery(migrationQuery)
  }

  private async setLatestAppliedVersion(): Promise<void> {
    const {version} = await this.repository.getLatestMigration()
    this.latestAppliedVersion = version
  }

  private async validateMigrationsIntegrity(): Promise<void> {
    const migrations = await this.repository.getMigrationInfo()

    for (const migration of migrations) {
      const {checksum, source: fileName} = migration.node

      // eslint-disable-next-line no-await-in-loop
      if (!(await this.isValidChecksum(fileName, checksum))) {
        throw new MigrationError(
          `Checksum mismatch for ${fileName}. The migration file has been modified after it was applied.`,
        )
      }
    }
  }
}
