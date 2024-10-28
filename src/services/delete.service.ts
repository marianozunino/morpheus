import {BASELINE} from '../constants'
import {MigrationError} from '../errors'
import {MigrationInfo, MigrationOptions} from '../types'
import {FileService} from './file.service'
import {Logger} from './logger'
import {Repository} from './neo4j.repository'

export class DeleteService {
  constructor(
    private readonly repository: Repository,
    private readonly fileService: FileService,
  ) {}

  async delete(identifier: string, options: MigrationOptions = {}): Promise<void> {
    try {
      const state = await this.repository.getMigrationState()

      if (!state.baselineExists) {
        throw new MigrationError('No migrations exist in the database')
      }

      const targetMigration = this.findTargetMigration(state.appliedMigrations, identifier)

      if (!targetMigration) {
        throw new MigrationError(`No migration found matching identifier: ${identifier}`)
      }

      if (options.dryRun) {
        await this.previewDeletion(targetMigration)
        return
      }

      await this.performDeletion(targetMigration, state.appliedMigrations)
    } catch (error) {
      throw new MigrationError(`Delete operation failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private findTargetMigration(migrations: MigrationInfo[], identifier: string): MigrationInfo | undefined {
    return migrations.find((migration) => migration.node.version === identifier) // || migration.node.source === identifier)
  }

  private async performDeletion(targetMigration: MigrationInfo, allMigrations: MigrationInfo[]): Promise<void> {
    Logger.info(`Deleting migration: ${targetMigration.node.source}`)

    // Sort migrations by version to ensure correct order
    const sortedMigrations = [...allMigrations].sort((a, b) =>
      this.fileService.compareVersions(a.node.version, b.node.version),
    )

    // Find the previous and next migrations in the chain
    const currentIndex = sortedMigrations.findIndex((m) => m.node.version === targetMigration.node.version)
    const previousMigration = currentIndex > 0 ? sortedMigrations[currentIndex - 1] : undefined
    const nextMigration = currentIndex < sortedMigrations.length - 1 ? sortedMigrations[currentIndex + 1] : undefined

    try {
      // Handle chain maintenance before deletion
      if (nextMigration) {
        // If there's a next migration, we need to connect it to the previous one
        // (which might be BASELINE or another migration)
        const previousVersion = previousMigration?.node.version || BASELINE
        await this.repository.createMigrationRelation(previousVersion, nextMigration.node.version)
      } else if (previousMigration) {
        // If this is the last migration, mark the previous one as latest
        await this.repository.markAsLatestMigration(previousMigration.node.version)
      }

      // Delete the target migration node and its relationships
      await this.repository.deleteMigration(targetMigration.node.version)

      Logger.info('Migration deleted successfully')
    } catch (error) {
      throw new MigrationError(
        `Failed to delete migration ${targetMigration.node.source}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private async previewDeletion(migration: MigrationInfo): Promise<void> {
    Logger.info('Dry run - no changes will be made to the database')
    Logger.info(`Would delete migration:`)
    Logger.info(`  Version: ${migration.node.version}`)
    Logger.info(`  Source: ${migration.node.source}`)
    Logger.info(`  Type: ${migration.node.type}`)
    Logger.info(`  Description: ${migration.node.description}`)
    Logger.info(`  Applied at: ${migration.relation.at}`)
    Logger.info(`  Duration: ${migration.relation.in}`)
    Logger.info('Dry run complete')
  }
}
