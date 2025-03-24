/* eslint-disable complexity */
/* eslint-disable max-depth */
/* eslint-disable no-await-in-loop */

import {bold, red} from 'kleur'

import {MigrationError} from '../errors'
import {FileService} from './file.service'
import {Logger} from './logger'
import {Repository} from './neo4j.repository'
import {generateChecksum} from './utils'

export interface ValidationOptions {
  failFast?: boolean
  summaryOnly?: boolean
}

export interface ValidationResult {
  failures: ValidationFailure[]
  isValid: boolean
}

export interface ValidationFailure {
  message: string
  severity: 'ERROR' | 'WARNING'
  type: 'CHECKSUM_MISMATCH' | 'MISSING_DB' | 'MISSING_FILE' | 'ORDER_MISMATCH' | 'OTHER'
  version?: string
}

export class ValidateService {
  private static readonly MESSAGES = {
    DB_CONNECT_ERROR: 'Failed to connect to the database',
    NO_MIGRATIONS: 'No migrations found in database or local directory',
    VALIDATION_ERROR: 'Migration validation failed',
    VALIDATION_SUCCESS: 'All migrations are valid',
  }

  constructor(
    private readonly repository: Repository,
    private readonly fileService: FileService,
  ) {}

  public async validate(options: ValidationOptions = {}): Promise<ValidationResult> {
    try {
      const [state, files] = await Promise.all([
        this.repository.getMigrationState(),
        this.fileService.getFileNamesFromMigrationsFolder(),
      ])

      const {appliedMigrations} = state

      if (appliedMigrations.length === 0 && files.length === 0) {
        Logger.info(ValidateService.MESSAGES.NO_MIGRATIONS)
        return {failures: [], isValid: true}
      }

      const failures: ValidationFailure[] = []

      for (const migration of appliedMigrations) {
        const {source: fileName, version} = migration.node

        if (!files.includes(fileName)) {
          const failure: ValidationFailure = {
            message: `Migration ${version} exists in database but file ${fileName} is missing locally`,
            severity: 'ERROR',
            type: 'MISSING_FILE',
            version,
          }
          failures.push(failure)

          if (options.failFast && failures.length > 0) {
            break
          }
        }
      }

      if (options.failFast && failures.length > 0) {
        return this.reportResult(failures, options)
      }

      const dbVersions = appliedMigrations.map((m) => m.node.version)
      const fileVersions: string[] = []

      for (const fileName of files) {
        const version = this.fileService.getMigrationVersionFromFileName(fileName)
        fileVersions.push(version)

        if (version === 'BASELINE') continue

        if (!dbVersions.includes(version)) {
          const failure: ValidationFailure = {
            message: `Migration file ${fileName} exists locally but has not been applied to the database`,
            severity: 'ERROR',
            type: 'MISSING_DB',
            version,
          }
          failures.push(failure)

          if (options.failFast && failures.length > 0) {
            break
          }
        }
      }

      if (options.failFast && failures.length > 0) {
        return this.reportResult(failures, options)
      }

      const sortedFileVersions = [...fileVersions].sort((a, b) => this.fileService.compareVersions(a, b))

      const sortedDbVersions = [...dbVersions].sort((a, b) => this.fileService.compareVersions(a, b))

      for (let i = 0; i < Math.min(sortedFileVersions.length, sortedDbVersions.length); i++) {
        if (sortedFileVersions[i] !== sortedDbVersions[i]) {
          const failure: ValidationFailure = {
            message: `Migration order mismatch: expected ${sortedFileVersions[i]} but found ${sortedDbVersions[i]} at position ${i}`,
            severity: 'ERROR',
            type: 'ORDER_MISMATCH',
            version: sortedFileVersions[i],
          }
          failures.push(failure)

          if (options.failFast) {
            break
          }
        }
      }

      if (options.failFast && failures.length > 0) {
        return this.reportResult(failures, options)
      }

      for (const migration of appliedMigrations) {
        if (migration.node.version === 'BASELINE') continue

        try {
          const {statements} = await this.fileService.prepareMigration(migration.node.source)
          const currentChecksum = generateChecksum(statements)

          if (currentChecksum !== migration.node.checksum) {
            const failure: ValidationFailure = {
              message: `Checksum mismatch for ${migration.node.source}: file was modified after it was applied to the database`,
              severity: 'ERROR',
              type: 'CHECKSUM_MISMATCH',
              version: migration.node.version,
            }
            failures.push(failure)

            if (options.failFast) {
              break
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          const failure: ValidationFailure = {
            message: `Failed to validate checksum for ${migration.node.source}: ${message}`,
            severity: 'ERROR',
            type: 'OTHER',
            version: migration.node.version,
          }
          failures.push(failure)

          if (options.failFast) {
            break
          }
        }
      }

      return this.reportResult(failures)
    } catch (error) {
      Logger.error(ValidateService.MESSAGES.VALIDATION_ERROR)
      throw this.wrapError(error)
    }
  }

  private printValidationFailures(failures: ValidationFailure[], summaryOnly: boolean = false): void {
    Logger.error(ValidateService.MESSAGES.VALIDATION_ERROR)

    const failuresByType: Record<string, ValidationFailure[]> = {}

    for (const failure of failures) {
      if (!failuresByType[failure.type]) {
        failuresByType[failure.type] = []
      }

      failuresByType[failure.type].push(failure)
    }

    Logger.info(bold('Validation Failure Summary:'))

    for (const [type, failures] of Object.entries(failuresByType)) {
      Logger.info(`${bold(type)}: ${red(failures.length.toString())} issue(s)`)
    }

    const MAX_EXAMPLES = 3
    for (const [type, typedFailures] of Object.entries(failuresByType)) {
      if (typedFailures.length > 0) {
        Logger.info(`\n${type} failures found:`)

        for (const failure of typedFailures.slice(0, MAX_EXAMPLES)) {
          Logger.info(`  - ${failure.message}`)
        }

        if (typedFailures.length > MAX_EXAMPLES) {
          Logger.info(`  - ... and ${typedFailures.length - MAX_EXAMPLES} more similar issues`)
        }
      }
    }

    Logger.info('\nSuggested actions:')
    if (failuresByType.MISSING_FILE) {
      Logger.info('  - For MISSING_FILE errors: Recover missing migration files from source control or backups')
    }

    if (failuresByType.MISSING_DB) {
      Logger.info('  - For MISSING_DB errors: Run "morpheus migrate" to apply pending migrations')
    }

    if (failuresByType.CHECKSUM_MISMATCH) {
      Logger.info(
        '  - For CHECKSUM_MISMATCH errors: Restore original migration files or use "morpheus clean" to reset (use with caution)',
      )
    }

    if (summaryOnly || !Logger.isDebugEnabled()) {
      Logger.info('\nRun with --debug flag to see full details of all failures')
      Logger.info('Or use --output-file=path/to/file.json to export full results')
    }

    if (Logger.isDebugEnabled() && !summaryOnly) {
      Logger.info('\nDetailed failure information:')

      const failuresByType: Record<
        string,
        Array<{
          message: string
          severity: string
          version: string
        }>
      > = {}

      for (const failure of failures) {
        if (!failuresByType[failure.type]) {
          failuresByType[failure.type] = []
        }

        failuresByType[failure.type].push({
          message: failure.message,
          severity: failure.severity,
          version: failure.version || 'N/A',
        })
      }

      const report = {
        failuresByType,
        timestamp: new Date().toISOString(),
        totalFailures: failures.length,
      }

      console.log(JSON.stringify(report, null, 2))
    }
  }

  private reportResult(failures: ValidationFailure[], options?: ValidationOptions): ValidationResult {
    const result: ValidationResult = {
      failures,
      isValid: failures.length === 0,
    }

    if (result.isValid) {
      Logger.info(ValidateService.MESSAGES.VALIDATION_SUCCESS)
    } else {
      this.printValidationFailures(failures, options?.summaryOnly)
    }

    return result
  }

  private wrapError(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error)
    return new MigrationError(`Validation error: ${message}`)
  }
}
