import { Injectable } from '@nestjs/common';
import { InitOptions, MigrationInfo, MigrationState } from '../types';
import { MigrationService } from './migration.service';
import { FsService } from './fs.service';
import { LazyModuleLoader } from '@nestjs/core';
import { Repository } from '../db/repository';
import { LoggerService } from '../logger.service';
import { convertAtToDate, convertInToTime } from '../utils';

@Injectable()
export class CliService {
  private repository: Repository;

  constructor(
    private readonly migrationService: MigrationService,
    private readonly fsService: FsService,
    private readonly lazyModuleLoader: LazyModuleLoader,
    private readonly logger: LoggerService,
  ) {}

  private async getRepository(): Promise<Repository> {
    if (this.repository) {
      return this.repository;
    }
    const { DbModule } = await import('../db/db.module');
    const moduleRef = await this.lazyModuleLoader.load(() => DbModule);

    await import('../db/repository');
    this.repository = moduleRef.get<Repository>(Repository);
    return this.repository;
  }

  public init(options: InitOptions): void {
    this.fsService.createMorpheusFile(options);
  }

  public async migrate(): Promise<void> {
    await this.migrationService.migrate();
  }

  public async getInfo() {
    const repository = await this.getRepository();
    const executedMigrations = await repository.getMigrationInfo();

    const files = await this.fsService.getFileNamesFromMigrationsFolder();

    if (executedMigrations.length > files.length) {
      this.logger.error(
        'There are more migrations in the database than in the migrations folder',
      );
      this.printExistingMigrations(executedMigrations);
      return;
    }

    if (executedMigrations.length === 0 && files.length === 0) {
      this.logger.log(
        'Database is up to date, but there are no migrations in the migrations folder',
      );
      return;
    }

    this.printTable(executedMigrations, files);
  }

  public async clean(dropConstraints: boolean): Promise<void> {
    const repository = await this.getRepository();
    await repository.dropChain();
    this.logger.log('Dropped chain');
    if (dropConstraints) {
      await this.repository.dropConstraints();
      this.logger.log('Dropped constraints');
    }
  }

  private printExistingMigrations(info: MigrationInfo[]) {
    this.logger.log('Existing migrations:');

    const table = info.map((migration) => {
      return {
        Version: migration.node.version,
        Description: migration.node.description,
        Type: migration.node.type,
        State: MigrationState.APPLIED,
        Source: migration.node.source,
      };
    });

    console.table(table);
  }

  private printTable(info: MigrationInfo[], files: string[]): void {
    const timeZoneOffsetSeconds = new Date().getTimezoneOffset() * 60;
    const table = files
      .map((fileName) => {
        const migrationVersion =
          this.fsService.getMigrationVersionFromFileName(fileName);

        const migrationDescription =
          this.fsService.getMigrationDescriptionFromFileName(fileName);

        const migration = info.find(
          (migration) => migration.node.version === migrationVersion,
        );

        if (migration) {
          const installedOn = convertAtToDate(
            migration.relation.at,
            timeZoneOffsetSeconds,
          );

          const executionTime = convertInToTime(migration.relation.in);

          return {
            Version: migration.node.version,
            Description: migration.node.description,
            Type: migration.node.type,
            InstalledOn: installedOn.toLocaleString(),
            ExecutionTime: executionTime,
            State: MigrationState.APPLIED,
            Source: migration.node.source,
          };
        } else {
          return {
            Version: migrationVersion,
            Description: migrationDescription,
            Type: 'CYPHER',
            InstalledOn: 'N/A',
            ExecutionTime: 'N/A',
            State: MigrationState.PENDING,
            Source: fileName,
          };
        }
      })
      .sort((a, b) => {
        // by installedOn
        if (a.InstalledOn === 'N/A') {
          return 1;
        }
        if (b.InstalledOn === 'N/A') {
          return -1;
        }
        return a.InstalledOn > b.InstalledOn ? 1 : -1;
      });

    console.table(table);
  }

  public async generateMigration(fileName: string) {
    await this.fsService.generateMigration(fileName);
  }

  // The validate operations resolves all local migrations and checks whether all have applied in the same order and in the same version to the configured database. A target database will validate as valid when all migrations have been applied in the right order and invalid in any cases where migrations are missing, have not been applied, applied in a different order or with a different checksum.
  public async validate(): Promise<void> {
    // Check if applied migrations are valid
    const invalidMigrations =
      await this.migrationService.reportMigrationsIntegrity();
    for (const migration of invalidMigrations) {
      this.logger.error(
        `${migration.node.version} is corrupted. Was the file modified after migration?`,
      );
    }
  }
}
