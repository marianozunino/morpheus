import {ensureDir, pathExists, readFile, readdir} from 'fs-extra'
import path from 'node:path'

import {DEFAULT_MIGRATIONS_PATH, MIGRATION_NAME_REGEX, VALID_FILE_EXTENSIONS} from '../constants'
import {MigrationError} from '../errors'
import {Neo4jConfig} from '../types'

interface PreparedMigration {
  description: string
  statements: string[]
  version: string
}

export class FileService {
  private readonly migrationsPath: string

  constructor(private readonly config: Neo4jConfig) {
    this.migrationsPath = this.resolveMigrationsPath()
  }

  compareVersions(v1: string, v2: string): number {
    return v1.localeCompare(v2, undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  }

  async getFileContent(fileName: string): Promise<string> {
    const filePath = path.join(this.migrationsPath, fileName)

    if (!(await pathExists(filePath))) {
      throw new MigrationError(
        `Missing migration: ${fileName}. Neo4j reports it as applied, but it is missing locally.`,
      )
    }

    try {
      return await readFile(filePath, 'utf8')
    } catch (error) {
      throw new MigrationError(`Failed to read migration file ${fileName}: ${error}`)
    }
  }

  async getFileNamesFromMigrationsFolder(): Promise<string[]> {
    try {
      await this.createMigrationsFolder()
      const files = await readdir(this.migrationsPath, {withFileTypes: true})

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

  private async createMigrationsFolder(): Promise<void> {
    try {
      await ensureDir(this.migrationsPath)
    } catch (error) {
      throw new MigrationError(`Failed to create migrations folder: ${error}`)
    }
  }

  private isValidMigrationFile(fileName: string): boolean {
    const extension = path.extname(fileName).toLowerCase()
    return VALID_FILE_EXTENSIONS.includes(extension) && MIGRATION_NAME_REGEX.test(fileName)
  }

  private resolveMigrationsPath(): string {
    const basePath = this.config.migrationsPath ?? DEFAULT_MIGRATIONS_PATH
    return path.resolve(process.cwd(), basePath)
  }

  private splitFileContentIntoStatements(fileContent: string): string[] {
    return fileContent
      .split(/;(?:\r?\n|\r)/)
      .map((statement) => statement.trim().replace(/;$/, ''))
      .filter(Boolean)
  }
}
