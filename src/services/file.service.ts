import fs from 'fs-extra'
import path from 'node:path'
import slugify from 'slugify'

import {
  DEFAULT_MIGRATIONS_PATH,
  MIGRATION_NAME_REGEX,
  MORPHEUS_FILE_NAME,
  STARTING_VERSION,
  VALID_FILE_EXTENSIONS,
} from '../constants'
import {MigrationError} from '../errors'
import {MigrationOptions, Neo4jConfig, Neo4jScheme} from '../types'
import {Logger} from './logger'

interface PreparedMigration {
  description: string
  statements: string[]
  version: string
}

export class FileService {
  private readonly logger: Logger = new Logger()
  private readonly migrationsPath: string
  private readonly migrationTemplate = 'CREATE (agent:`007`) RETURN agent;'

  constructor(private readonly config: Neo4jConfig) {
    this.migrationsPath = this.resolveMigrationsPath()
  }

  compareVersions(v1: string, v2: string): number {
    return v1.localeCompare(v2, undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  }

  public createConfigFile(force = false): void {
    if (!force && fs.existsSync(MORPHEUS_FILE_NAME)) {
      throw new MigrationError(`Config file already exists: ${MORPHEUS_FILE_NAME}`)
    }

    const defaultConfig: Neo4jConfig = {
      database: 'neo4j',
      host: 'localhost',
      migrationsPath: DEFAULT_MIGRATIONS_PATH,
      password: 'neo4j',
      port: 7687,
      scheme: Neo4jScheme.NEO4J,
      username: 'neo4j',
    }

    try {
      fs.writeFileSync(MORPHEUS_FILE_NAME, JSON.stringify(defaultConfig, null, 2))
      this.logger.success(`Config file created: ${MORPHEUS_FILE_NAME}`)
    } catch (error) {
      throw new MigrationError(`Failed to create config file: ${error}`)
    }
  }

  async generateMigration(fileName: string, options: MigrationOptions = {}): Promise<void> {
    try {
      this.validateFileName(fileName)
      const safeFileName = this.sanitizeFileName(fileName)
      await this.createMigrationsFolder()

      const newVersion = await this.generateMigrationVersion()
      const fileNameWithPrefix = `V${newVersion}__${safeFileName}.cypher`
      const filePath = path.join(this.migrationsPath, fileNameWithPrefix)

      await this.createMigrationFile(filePath, options.template ?? this.migrationTemplate, options.force)
      this.logger.success(`Migration file created: ${filePath}`)
    } catch (error) {
      throw new MigrationError(
        `Failed to generate migration: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  async getFileContent(fileName: string): Promise<string> {
    const filePath = path.join(this.migrationsPath, fileName)

    if (!(await fs.pathExists(filePath))) {
      throw new MigrationError(
        `Missing migration: ${fileName}. Neo4j reports it as applied, but it is missing locally.`,
      )
    }

    try {
      return await fs.readFile(filePath, 'utf8')
    } catch (error) {
      throw new MigrationError(`Failed to read migration file ${fileName}: ${error}`)
    }
  }

  async getFileNamesFromMigrationsFolder(): Promise<string[]> {
    try {
      await this.createMigrationsFolder()
      const files = await fs.readdir(this.migrationsPath, {withFileTypes: true})

      return files
        .filter((file) => file.isFile() && this.isValidMigrationFile(file.name))
        .map((file) => file.name)
        .sort()
    } catch (error) {
      throw new MigrationError(`Failed to read migrations folder: ${error}`)
    }
  }

  getMigrationDescriptionFromFileName(fileName: string): string {
    const result = fileName.match(MIGRATION_NAME_REGEX)
    if (!result?.groups?.description) {
      throw new MigrationError(`Invalid or missing description in migration file name: ${fileName}`)
    }

    return result.groups.description
  }

  getMigrationVersionFromFileName(fileName: string): string {
    const result = fileName.match(MIGRATION_NAME_REGEX)
    if (!result?.groups?.version) {
      throw new MigrationError(`Invalid or missing version in migration file name: ${fileName}`)
    }

    return result.groups.version.replaceAll('_', '.')
  }

  async prepareMigration(fileName: string): Promise<PreparedMigration> {
    const fileContent = await this.getFileContent(fileName)
    const version = this.getMigrationVersionFromFileName(fileName)
    const description = this.getMigrationDescriptionFromFileName(fileName)
    const statements = this.splitFileContentIntoStatements(fileContent)

    return {description, statements, version}
  }

  private async createMigrationFile(filePath: string, content: string, force = false): Promise<void> {
    if (!force && (await fs.pathExists(filePath))) {
      throw new MigrationError(`Migration file already exists: ${filePath}`)
    }

    try {
      await fs.writeFile(filePath, this.formatFileContent(content))
    } catch (error) {
      throw new MigrationError(`Failed to write migration file: ${error}`)
    }
  }

  private async createMigrationsFolder(): Promise<void> {
    try {
      await fs.ensureDir(this.migrationsPath)
    } catch (error) {
      throw new MigrationError(`Failed to create migrations folder: ${error}`)
    }
  }

  private formatFileContent(content: string): string {
    return content.trim() + '\n'
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

  private isValidMigrationFile(fileName: string): boolean {
    const extension = path.extname(fileName).toLowerCase()
    return VALID_FILE_EXTENSIONS.includes(extension) && MIGRATION_NAME_REGEX.test(fileName)
  }

  private resolveMigrationsPath(): string {
    const basePath = this.config.migrationsPath ?? DEFAULT_MIGRATIONS_PATH
    return path.resolve(process.cwd(), basePath)
  }

  private sanitizeFileName(fileName: string): string {
    return slugify(fileName, {lower: false})
  }

  private splitFileContentIntoStatements(fileContent: string): string[] {
    return fileContent
      .split(/;(?:\r?\n|\r)/)
      .map((statement) => statement.trim().replace(/;$/, ''))
      .filter(Boolean)
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
