import {Table} from 'console-table-printer'

import {MigrationInfo, MigrationState, MigrationTableRow} from '../types'
import {FileService} from './file.service'
import {Logger} from './logger'
import {Repository} from './neo4j.repository'
import {convertAtToDate, convertInToTime} from './utils'

interface MigrationComparisonResult {
  readonly hasMoreMigrationsInDb: boolean
  readonly noMigrations: boolean
}

export class InfoService {
  private static readonly EXCESS_MIGRATIONS_MESSAGE =
    'There are more migrations in the database than in the migrations folder'

  private readonly logger: Logger

  private static readonly NO_MIGRATIONS_MESSAGE =
    'Database is up to date, but there are no migrations in the migrations folder'

  constructor(
    private readonly repository: Repository,
    private readonly fileService: FileService,
    logger?: Logger,
  ) {
    this.logger = logger ?? new Logger()
  }

  public async getInfo(): Promise<void> {
    try {
      const [executedMigrations, files] = await Promise.all([
        this.repository.getMigrationInfo(),
        this.fileService.getFileNamesFromMigrationsFolder(),
      ])

      const comparison = this.compareMigrations(executedMigrations, files)

      if (comparison.hasMoreMigrationsInDb) {
        this.logger.error(InfoService.EXCESS_MIGRATIONS_MESSAGE)
        this.printExistingMigrations(executedMigrations)
        return
      }

      if (comparison.noMigrations) {
        this.logger.success(InfoService.NO_MIGRATIONS_MESSAGE)
        return
      }

      this.printMigrationTable(executedMigrations, files)
    } catch (error) {
      this.logger.error('Failed to retrieve migration information')
      throw this.enhanceError(error)
    }
  }

  private compareMigrations(executedMigrations: MigrationInfo[], files: string[]): MigrationComparisonResult {
    return {
      hasMoreMigrationsInDb: executedMigrations.length > files.length,
      noMigrations: executedMigrations.length === 0 && files.length === 0,
    }
  }

  private createExistingMigrationRow(migration: MigrationInfo): Partial<MigrationTableRow> {
    return {
      Description: migration.node.description,
      Source: migration.node.source,
      State: MigrationState.APPLIED,
      Type: migration.node.type,
      Version: migration.node.version,
    }
  }

  private enhanceError(error: unknown): Error {
    if (error instanceof Error) {
      error.message = `InfoService error: ${error.message}`
      return error
    }

    return new Error(`InfoService error: ${String(error)}`)
  }

  private printExistingMigrations(info: MigrationInfo[]): void {
    this.logger.success('Existing migrations:')
    const table = info.map((migration) => this.createExistingMigrationRow(migration))
    console.table(table)
  }

  private printMigrationTable(info: MigrationInfo[], files: string[]): void {
    const timeZoneOffsetSeconds = new Date().getTimezoneOffset() * 60

    const table = new Table({
      columns: [
        {alignment: 'left', name: 'Version'},
        {alignment: 'left', name: 'Description'},
        {alignment: 'right', name: 'ExecutionTime'},
        {alignment: 'left', name: 'InstalledOn'},
        {alignment: 'center', name: 'State'},
      ],
    })

    for (const migration of files
      .map((fileName) => {
        const migrationVersion = this.fileService.getMigrationVersionFromFileName(fileName)
        const migrationDescription = this.fileService.getMigrationDescriptionFromFileName(fileName)
        const migration = info.find((m) => m.node.version === migrationVersion)

        if (migration) {
          const installedOn = convertAtToDate(migration.relation.at, timeZoneOffsetSeconds)
          const executionTime = convertInToTime(migration.relation.in)
          return {
            Description: migration.node.description,
            ExecutionTime: executionTime,
            InstalledOn: installedOn.getTime(),
            State: MigrationState.APPLIED,
            Version: migration.node.version,
          }
        }

        return {
          Description: migrationDescription,
          ExecutionTime: 'N/A',
          InstalledOn: 'N/A',
          State: MigrationState.PENDING,
          Version: migrationVersion,
        }
      })
      .sort((a, b) => this.fileService.compareVersions(a.Version, b.Version))) {
      const color = migration.State === MigrationState.APPLIED ? 'green' : 'yellow'
      table.addRow(migration, {color})
    }

    table.printTable()
  }
}
