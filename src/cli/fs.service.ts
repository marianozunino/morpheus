import { Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import {
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
} from 'fs';
import { join, resolve } from 'path';
import { Neo4jConfig } from '../config/config-loader';
import {
  STARTING_VERSION,
  GLOBAL_CONFIG_TOKEN,
  MIGRATION_NAME_REGEX,
  DEFAULT_MIGRATIONS_PATH,
  MORPHEUS_FILE_NAME,
} from '../app.constants';
import { LazyModuleLoader } from '@nestjs/core';
import config from '../config/env.config';
import { InitOptions } from '../types';
import { LoggerService } from '../logger.service';
import mollusc from 'mollusc';

@Injectable()
export class FsService {
  private _migrationsPath: string;

  constructor(
    private readonly lazyModuleLoader: LazyModuleLoader,
    private readonly logger: LoggerService,
  ) {}

  private async getMigrationsPath(): Promise<string> {
    if (this._migrationsPath) {
      return this._migrationsPath;
    }
    const { ConfigModule } = await import('../config/config.module');
    const moduleRef = await this.lazyModuleLoader.load(() => ConfigModule);

    await import('../config/config.provider');
    const loadedCfg =
      moduleRef.get<ConfigType<typeof config>>(GLOBAL_CONFIG_TOKEN);
    this._migrationsPath = loadedCfg?.migrationsPath ?? DEFAULT_MIGRATIONS_PATH;
    return this._migrationsPath;
  }

  public async generateMigration(fileName: string) {
    const safeFileName = mollusc(fileName, { lower: false });

    const migrationsPath = await this.getMigrationsPath();
    await this.createMigrationsFolder();

    const newVersion = await this.generateMigrationVersion();
    const fileNameWithPrefix = `V${newVersion}__${safeFileName}.cypher`;
    const filePath = join(migrationsPath, fileNameWithPrefix);

    const fileContent = `CREATE (agent:\`007\`) RETURN agent;`;
    writeFileSync(filePath, fileContent);

    this.logger.log(`Migration file created: ${filePath}`);
  }

  private async createMigrationsFolder(): Promise<void> {
    const migrationsPath = await this.getMigrationsPath();
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
      scheme: 'neo4j',
      migrationsPath: DEFAULT_MIGRATIONS_PATH,
    };
    writeFileSync(MORPHEUS_FILE_NAME, JSON.stringify(defaultConfig, null, 2));
    this.logger.log(`Morpheus file created: ${MORPHEUS_FILE_NAME}`);
  }

  // filename format: V<number>_<name>.cypher
  public async getFileNamesFromMigrationsFolder(): Promise<string[]> {
    const migrationsPath = await this.getMigrationsPath();

    await this.createMigrationsFolder();

    const configPath = resolve(process.cwd(), migrationsPath);
    return readdirSync(configPath);
  }

  public async getFileContent(fileName: string): Promise<string> {
    const migrationsPath = await this.getMigrationsPath();
    const filePath = resolve(process.cwd(), migrationsPath, fileName);

    if (!existsSync(filePath)) {
      throw new Error(
        `Missing migration: ${fileName}. Neo4j reports it as applied, but it is missing locally.`,
      );
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
