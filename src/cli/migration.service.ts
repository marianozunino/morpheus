import { Injectable } from '@nestjs/common';
import { generateChecksum } from '../utils';
import { BASELINE } from '../app.constants';
import { Repository } from '../db/repository';
import { MigrationInfo, Neo4jMigrationNode } from '../types';
import { FsService } from './fs.service';
import { LazyModuleLoader } from '@nestjs/core';
import { LoggerService } from '../logger.service';

@Injectable()
export class MigrationService {
  private latestAppliedVersion: string;
  private _repository: Repository;

  constructor(
    private readonly lazyModuleLoader: LazyModuleLoader,
    private readonly fsService: FsService,
    private readonly logger: LoggerService,
  ) {}

  private async getRepository(): Promise<Repository> {
    if (this._repository) {
      return this._repository;
    }
    const { DbModule } = await import('../db/db.module');
    const moduleRef = await this.lazyModuleLoader.load(() => DbModule);

    await import('../db/repository');
    this._repository = moduleRef.get<Repository>(Repository);
    return this._repository;
  }

  public async migrate() {
    await this.assertBaseNodeExists();
    await this.getLatestAppliedVersion();
    await this.validateMigrationsIntegrity();
    const candidateMigrations = await this.getCandidateMigrations();

    if (candidateMigrations.length === 0) {
      this.logger.log('Database is up to date');
      return;
    }

    for (const fileName of candidateMigrations) {
      await this.prepareAndMigrateFile(fileName);
    }
  }

  private async prepareAndMigrateFile(fileName: string): Promise<void> {
    const repository = await this.getRepository();

    const fileContent = await this.fsService.getFileContent(fileName);
    const version = this.fsService.getMigrationVersionFromFileName(fileName);
    const description =
      this.fsService.getMigrationDescriptionFromFileName(fileName);

    const statements = this.splitFileContentIntoStatements(fileContent);

    this.logger.log(`Executing migration: ${fileName}`);

    const trx = repository.getTransaction();
    const startTime = new Date().getTime();

    await repository.executeQueries(statements, trx);

    const endTime = new Date().getTime();
    const duration = endTime - startTime;
    await trx.commit();

    const migrationNode: Neo4jMigrationNode = {
      version,
      description,
      checksum: generateChecksum(statements),
      source: fileName,
      type: 'CYPHER',
    };

    const migrationQuery = repository.buildMigrationQuery(
      migrationNode,
      this.latestAppliedVersion,
      duration,
    );

    await repository.executeQuery(migrationQuery);

    this.latestAppliedVersion = version;
  }

  private async getCandidateMigrations(): Promise<string[]> {
    const fileNames = await this.fsService.getFileNamesFromMigrationsFolder();
    const candidateMigrations = fileNames.filter((fileName) => {
      const version = this.fsService.getMigrationVersionFromFileName(fileName);
      return (
        this.latestAppliedVersion === BASELINE ||
        version.localeCompare(this.latestAppliedVersion, undefined, {
          numeric: true,
          sensitivity: 'base',
        }) > 0
      );
    });

    // sort migrations by version. eg: 1.1.1 < 1.1.2 < 1.2.1 < 2.1.1 < 2.9.1 < 2.10.1 < 2.11.0
    return candidateMigrations.sort((a, b) => {
      const versionA = this.fsService.getMigrationVersionFromFileName(a);
      const versionB = this.fsService.getMigrationVersionFromFileName(b);
      return versionA.localeCompare(versionB, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });
  }

  private async validateMigrationsIntegrity(): Promise<void> {
    const repository = await this.getRepository();
    const migrations = await repository.getMigrationInfo();
    for (const row of migrations) {
      const { source: fileName, checksum } = row.node;
      if (!(await this.isValidChecksum(fileName, checksum))) {
        throw new Error(
          `The checksum of ${fileName} does not match the checksum in the database`,
        );
      }
    }
  }

  public async reportMigrationsIntegrity(): Promise<MigrationInfo[]> {
    const repository = await this.getRepository();
    const migrations = await repository.getMigrationInfo();
    const invalidMigrations = migrations.filter((row) => {
      const { source: fileName, checksum } = row.node;
      return !this.isValidChecksum(fileName, checksum);
    });
    return invalidMigrations;
  }

  private async isValidChecksum(
    fileName: string,
    previousChecksum: string,
  ): Promise<boolean> {
    const fileContent = await this.fsService.getFileContent(fileName);
    const statements = this.splitFileContentIntoStatements(fileContent);
    const checksum = generateChecksum(statements);
    return previousChecksum === checksum;
  }

  private async getLatestAppliedVersion(): Promise<string> {
    const repository = await this.getRepository();
    const { version } = await repository.getLatestMigration();
    this.latestAppliedVersion = version;
    return version;
  }

  private async assertBaseNodeExists(): Promise<void> {
    const repository = await this.getRepository();
    const baseNode = await repository.fetchBaselineNode();
    if (!baseNode) {
      await repository.createConstraints();
      await repository.createBaseNode();
    }
  }

  private splitFileContentIntoStatements(fileContent: string): string[] {
    return fileContent
      .split(/;(:?\r?\n|\r)/)
      .map((statement) => statement.trim().replace(/;$/, ''))
      .filter((statement) => statement !== '');
  }
}
