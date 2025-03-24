import {Flags} from '@oclif/core'
import * as fs from 'fs-extra'

import {BaseCommand} from '../base-command'
import {getDatabaseConnection} from '../neo4j/connection'
import {FileService} from '../services/file.service'
import {Logger} from '../services/logger'
import {Repository} from '../services/neo4j.repository'
import {ValidateService} from '../services/validate.service'

export default class Validate extends BaseCommand<typeof Validate> {
  static override description = `Validate migration state between local files and database

  Validates that all migrations in the migrations folder have been applied to the database
  in the correct order and with matching checksums. Reports discrepancies.`

  static override examples = [
    '<%= config.bin %> validate',
    '<%= config.bin %> validate -m ~/path/to/migrations',
    '<%= config.bin %> validate --config ./custom-config.json',
    '<%= config.bin %> validate --fail-fast',
    '<%= config.bin %> validate --summary-only',
    '<%= config.bin %> validate --output-file=validation-report.json',
    '<%= config.bin %> validate --debug',
  ]

  static override flags = {
    ...BaseCommand.flags,
    'fail-fast': Flags.boolean({
      default: false,
      description: 'Exit with error code on first validation failure',
    }),
    'output-file': Flags.string({
      char: 'o',
      description: 'Write detailed validation results to a JSON file',
    }),
    'summary-only': Flags.boolean({
      default: false,
      description: 'Show only the summary of validation failures',
    }),
  }

  public async run(): Promise<void> {
    try {
      const {flags} = await this.parse(Validate)
      const config = this.getConfig()

      const connection = await getDatabaseConnection(config)
      const repository = new Repository(connection)
      const fileService = new FileService(config)

      const result = await new ValidateService(repository, fileService).validate({
        failFast: flags['fail-fast'],
        summaryOnly: flags['summary-only'],
      })

      if (flags['output-file']) {
        const outputPath = flags['output-file']

        try {
          const failuresByType: Record<
            string,
            Array<{
              message: string
              severity: string
              version: string
            }>
          > = {}

          for (const failure of result.failures) {
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
            details: failuresByType,
            metadata: {
              databaseUri: `${config.scheme}://${config.host}:${config.port}`,
              migrationsPath: config.migrationsPath,
              timestamp: new Date().toISOString(),
            },
            summary: {
              failuresByType: Object.fromEntries(
                Object.entries(failuresByType).map(([type, failures]) => [type, failures.length]),
              ),
              isValid: result.isValid,
              totalFailures: result.failures.length,
            },
          }

          await fs.writeJSON(outputPath, report, {spaces: 2})

          Logger.info(`Detailed validation report written to: ${outputPath}`)
        } catch (error) {
          Logger.error(
            `Failed to write validation report to file: ${error instanceof Error ? error.message : String(error)}`,
          )
        }
      }

      await connection.close()
    } catch (error) {
      this.error(error instanceof Error ? error.message : String(error))
    }
  }
}
