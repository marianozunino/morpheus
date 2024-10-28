import {ensureDir, readdir, writeFile} from 'fs-extra'
import path from 'node:path'
import slugify from 'slugify'

import {DEFAULT_MIGRATIONS_PATH, MIGRATION_NAME_REGEX, STARTING_VERSION, VALID_FILE_EXTENSIONS} from '../constants'
import {MigrationError} from '../errors'
import {Neo4jConfig} from '../types'
import {Logger} from './logger'

export class CreateService {
  private readonly migrationTemplate: string = 'CREATE (agent:`007`) RETURN agent;'

  constructor(private readonly config: Pick<Neo4jConfig, 'migrationsPath'>) {}

  public async generateMigration(fileName: string): Promise<void> {
    try {
      this.validateFileName(fileName)

      const safeFileName = this.sanitizeFileName(fileName)
      const migrationsPath = this.getMigrationsPath()

      await this.createMigrationsFolder()

      const newVersion = await this.generateMigrationVersion()
      const fileNameWithPrefix = `V${newVersion}__${safeFileName}.cypher`
      const filePath = path.join(migrationsPath, fileNameWithPrefix)

      await this.createMigrationFile(filePath, this.migrationTemplate)
      Logger.info(`Migration file created: ${filePath}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred'
      throw new MigrationError(`Failed to generate migration: ${message}`)
    }
  }

  private compareVersions(v1: string, v2: string): number {
    return v1.localeCompare(v2, undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  }

  private async createMigrationFile(filePath: string, content: string): Promise<void> {
    try {
      await writeFile(filePath, content.trim() + '\n')
    } catch (error) {
      throw new MigrationError(`Failed to write migration file: ${error}`)
    }
  }

  private async createMigrationsFolder(): Promise<void> {
    try {
      const migrationsPath = this.getMigrationsPath()
      await ensureDir(migrationsPath)
    } catch (error) {
      throw new MigrationError(`Failed to create migrations folder: ${error}`)
    }
  }

  private async generateMigrationVersion(): Promise<string> {
    const fileNames = await this.getFileNamesFromMigrationsFolder()
    let latestVersion = STARTING_VERSION

    for (const fileName of fileNames) {
      const version = this.getMigrationVersionFromFileName(fileName)
      if (this.compareVersions(version, latestVersion) > 0) {
        latestVersion = version
      }
    }

    const [major] = latestVersion.split('.').map(Number)
    return `${major + 1}_0_0`
  }

  private async getFileNamesFromMigrationsFolder(): Promise<string[]> {
    try {
      const migrationsPath = this.getMigrationsPath()
      await this.createMigrationsFolder()

      const files = await readdir(migrationsPath, {withFileTypes: true})
      return files
        .filter((file) => file.isFile() && this.isValidMigrationFile(file.name))
        .map((file) => file.name)
        .sort()
    } catch (error) {
      throw new MigrationError(`Failed to read migrations folder: ${error}`)
    }
  }

  private getMigrationsPath(): string {
    const basePath = this.config.migrationsPath ?? DEFAULT_MIGRATIONS_PATH
    return path.resolve(process.cwd(), basePath)
  }

  private getMigrationVersionFromFileName(fileName: string): string {
    const result = fileName.match(MIGRATION_NAME_REGEX)
    if (!result?.groups?.version) {
      throw new MigrationError(`Invalid or missing version in migration file name: ${fileName}`)
    }

    return result.groups.version.replaceAll('_', '.')
  }

  private isValidMigrationFile(fileName: string): boolean {
    const extension = path.extname(fileName).toLowerCase()
    return VALID_FILE_EXTENSIONS.includes(extension) && MIGRATION_NAME_REGEX.test(fileName)
  }

  private sanitizeFileName(fileName: string): string {
    return slugify(fileName, {lower: false})
  }

  private validateFileName(fileName: string): void {
    if (!fileName || fileName.trim().length === 0) {
      throw new MigrationError('Migration file name cannot be empty')
    }

    if (fileName.length > 100) {
      throw new MigrationError('Migration file name is too long (max 100 characters)')
    }

    if (/["*/:<>?\\|]/.test(fileName)) {
      throw new MigrationError('Migration file name contains invalid characters')
    }
  }
}
