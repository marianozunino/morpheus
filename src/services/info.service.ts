import {MigrationInfo, MigrationState} from '../types'
import {FileService} from './file.service'
import {Logger} from './logger'
import {Repository} from './neo4j.repository'
import {convertAtToDate, convertInToTime} from './utils'

export class InfoService {
  private static readonly MESSAGES = {
    ERROR: 'Failed to retrieve migration information',
    EXCESS_MIGRATIONS: 'There are more migrations in the database than in the migrations folder',
    NO_MIGRATIONS: 'Database is up to date, but there are no migrations in the migrations folder',
  }

  constructor(
    private readonly repository: Repository,
    private readonly fileService: FileService,
  ) {}

  public async getInfo(): Promise<void> {
    try {
      const [state, files] = await Promise.all([
        this.repository.getMigrationState(),
        this.fileService.getFileNamesFromMigrationsFolder(),
      ])

      const {appliedMigrations} = state

      if (appliedMigrations.length > files.length) {
        Logger.error(InfoService.MESSAGES.EXCESS_MIGRATIONS)
        this.printMigrationSummary(appliedMigrations)
        return
      }

      if (appliedMigrations.length === 0 && files.length === 0) {
        Logger.info(InfoService.MESSAGES.NO_MIGRATIONS)
        return
      }

      this.printDetailedMigrationTable(appliedMigrations, files)
    } catch (error) {
      Logger.error(InfoService.MESSAGES.ERROR)
      throw this.wrapError(error)
    }
  }

  private printDetailedMigrationTable(migrations: MigrationInfo[], files: string[]): void {
    const table = files
      .map((fileName) => {
        const version = this.fileService.getMigrationVersionFromFileName(fileName)
        const appliedMigration = migrations.find((m) => m.node.version === version)

        if (appliedMigration) {
          return {
            Description: appliedMigration.node.description,
            ExecutionTime: convertInToTime(appliedMigration.relation.in),
            InstalledOn: convertAtToDate(appliedMigration.relation.at).getTime(),
            State: MigrationState.APPLIED,
            Version: version,
          }
        }

        return {
          Description: this.fileService.getMigrationDescriptionFromFileName(fileName),
          ExecutionTime: 'N/A',
          InstalledOn: 'N/A',
          State: MigrationState.PENDING,
          Version: version,
        }
      })
      .sort((a, b) => this.fileService.compareVersions(a.Version, b.Version))

    console.table(table)
  }

  private printMigrationSummary(migrations: MigrationInfo[]): void {
    Logger.info('Existing migrations:')

    const summary = migrations.map((migration) => ({
      Description: migration.node.description,
      Source: migration.node.source,
      State: MigrationState.APPLIED,
      Type: migration.node.type,
      Version: migration.node.version,
    }))

    console.table(summary)
  }

  private wrapError(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error)
    return new Error(`InfoService error: ${message}`)
  }
}
