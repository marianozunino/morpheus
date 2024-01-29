import { writeFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'fs';

import { join, resolve } from 'path';
import { Injectable } from '@nestjs/common';
import mollusc from 'mollusc';

import {
  MORPHEUS_FILE_NAME,
  DEFAULT_MIGRATIONS_PATH,
  MIGRATION_NAME_REGEX,
  STARTING_VERSION,
  InitOptions,
  Neo4jConfig,
  Neo4jScheme,
  Logger,
  ConfigService,
} from '../..';

@Injectable()
export class FsService {
  private readonly logger = new Logger(FsService.name);

  constructor() {}

  public async generateMigration(fileName: string): Promise<void> {
    const migrationsPath = ConfigService.getMigrationsPath();
    const safeFileName = mollusc(fileName, { lower: false });

    await this.createMigrationsFolder(migrationsPath);

    const newVersion = await this.generateMigrationVersion();
    const fileNameWithPrefix = `V${newVersion}__${safeFileName}.cypher`;
    const filePath = join(migrationsPath, fileNameWithPrefix);

    const fileContent = `CREATE (agent:\`007\`) RETURN agent;`;
    writeFileSync(filePath, fileContent);

    this.logger.log(`Migration file created: ${filePath}`);
  }

  private async createMigrationsFolder(migrationsPath: string): Promise<void> {
    if (!existsSync(migrationsPath)) {
      mkdirSync(migrationsPath, { recursive: true });
      this.logger.log(`Migrations folder created: ${migrationsPath}`);
    }
  }

  public createMorpheusFile(options: InitOptions): void {
    if (options.force) {
      this.writeConfigFile();
    } else {
      if (existsSync(MORPHEUS_FILE_NAME)) {
        throw new Error(`Morpheus file already exists: ${MORPHEUS_FILE_NAME}`);
      }
      this.writeConfigFile();
    }
  }

  private writeConfigFile(): void {
    const defaultConfig: Neo4jConfig = {
      host: 'localhost',
      port: 7687,
      username: 'neo4j',
      password: 'neo4j',
      scheme: Neo4jScheme.NEO4J,
      migrationsPath: DEFAULT_MIGRATIONS_PATH,
      database: 'neo4j',
    };
    writeFileSync(MORPHEUS_FILE_NAME, JSON.stringify(defaultConfig, null, 2));
    this.logger.log(`Morpheus file created: ${MORPHEUS_FILE_NAME}`);
  }

  // filename format: V<number>_<name>.cypher
  public async getFileNamesFromMigrationsFolder(): Promise<string[]> {
    const migrationsPath = ConfigService.getMigrationsPath();
    await this.createMigrationsFolder(migrationsPath);

    const configPath = resolve(process.cwd(), migrationsPath);
    return readdirSync(configPath);
  }

  public async getFileContent(fileName: string): Promise<string> {
    const migrationsPath = ConfigService.getMigrationsPath();
    const filePath = resolve(process.cwd(), migrationsPath, fileName);

    if (!existsSync(filePath)) {
      throw new Error(`Missing migration: ${fileName}. Neo4j reports it as applied, but it is missing locally.`);
    }
    const fileContent = readFileSync(filePath, 'utf8');
    return fileContent;
  }

  public getMigrationVersionFromFileName(fileName: string): string {
    const result = fileName.match(MIGRATION_NAME_REGEX);

    if (!result) {
      throw new Error(`Invalid migration file name: ${fileName}`);
    }

    const { version } = result.groups;

    return version.replace(/_/g, '.');
  }

  public getMigrationDescriptionFromFileName(fileName: string): string {
    const result = fileName.match(MIGRATION_NAME_REGEX);

    if (!result) {
      throw new Error(`Invalid migration file name: ${fileName}`);
    }

    const { description } = result.groups;

    return description;
  }

  public validateFileName(fileName: string): void {
    const result = fileName.match(MIGRATION_NAME_REGEX);

    if (!result) {
      throw new Error(`Invalid migration file name: ${fileName}`);
    }
  }

  private async generateMigrationVersion(): Promise<string> {
    this.logger.log('Generating migration version');
    const fileNames = await this.getFileNamesFromMigrationsFolder();

    const latestVersion = fileNames.reduce((acc, fileName) => {
      const version = this.getMigrationVersionFromFileName(fileName);
      return version.localeCompare(acc, undefined, {
        numeric: true,
        sensitivity: 'base',
      }) > 0
        ? version
        : acc;
    }, STARTING_VERSION);

    // increment first digit
    const latestVersionArray = latestVersion.split('.').map(Number)[0];
    return `${latestVersionArray + 1}_0_0`;
  }
}
