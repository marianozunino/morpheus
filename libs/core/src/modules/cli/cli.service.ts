import { DateService, FsService, InitOptions, Logger, MigrationInfo, MigrationState, VALIDATION_ERROR_KIND } from '../../';
import { RepositoryService } from '../repository/repository.service';

import { Injectable } from '@nestjs/common';
import { MigrationService } from './migration.service';

@Injectable()
export class CliService {
  private readonly logger = new Logger(CliService.name);

  constructor(
    private readonly fsService: FsService,
    private readonly repository: RepositoryService,
    private readonly migrationService: MigrationService,
  ) {}

  public init(options: InitOptions): void {
    this.fsService.createMorpheusFile(options);
  }

  public async migrate(): Promise<void> {
    await this.migrationService.migrate();
  }

  public async getInfo(): Promise<void> {
    const executedMigrations = await this.repository.getMigrationInfo();
    const files = await this.fsService.getFileNamesFromMigrationsFolder();
    if (executedMigrations.length > files.length) {
      this.logger.error('There are more migrations in the database than in the migrations folder');
      this.printExistingMigrations(executedMigrations);
      return;
    }
    if (executedMigrations.length === 0 && files.length === 0) {
      this.logger.log('Database is up to date, but there are no migrations in the migrations folder');
      return;
    }
    this.printTable(executedMigrations, files);
  }

  public async clean(dropConstraints: boolean): Promise<void> {
    await this.repository.dropChain();
    this.logger.log('Dropped chain');
    if (dropConstraints) {
      await this.repository.dropConstraints();
      this.logger.log('Dropped constraints');
    }
  }

  private printExistingMigrations(info: MigrationInfo[]): void {
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
        const migrationVersion = this.fsService.getMigrationVersionFromFileName(fileName);

        const migrationDescription = this.fsService.getMigrationDescriptionFromFileName(fileName);

        const migration = info.find((migration) => migration.node.version === migrationVersion);

        if (migration) {
          const installedOn = DateService.convertAtToDate(migration.relation.at, timeZoneOffsetSeconds);

          const executionTime = DateService.convertInToTime(migration.relation.in);

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

  public async generateMigration(fileName: string): Promise<void> {
    await this.fsService.generateMigration(fileName);
  }

  // The validate operations resolves all local migrations and checks whether all have applied in the same order and in the same version to the configured database.
  // A target database will validate as valid when all migrations have been applied in the right order and invalid in any cases where migrations are missing, have not been applied, applied in a different order or with a different checksum.
  public async validate(): Promise<void> {
    // Check if applied migrations are valid
    try {
      const invalidMigrations = await this.migrationService.reportMigrationsIntegrity();
      for (const key in invalidMigrations) {
        switch (key) {
          case VALIDATION_ERROR_KIND.MISSING:
            for (const migration of invalidMigrations[key].report) {
              this.logger.error(`The migration ${migration.node.source} has been applied but is missing in the migrations folder.`);
            }
            break;
          case VALIDATION_ERROR_KIND.NON_APPLIED:
            for (const migration of invalidMigrations[key].report) {
              this.logger.error(`The migration ${migration.node.source} has not been applied.`);
            }
            break;
          case VALIDATION_ERROR_KIND.MISMATCH_ORDER:
            this.logger.error(
              `Migrations are out of order: ${invalidMigrations[key].report[0].node.source} was applied before ${invalidMigrations[key].report[1].node.source}. Was the latter added after the former was applied?`,
            );
            break;
          case VALIDATION_ERROR_KIND.MISMATCH_CHECKSUM:
            for (const migration of invalidMigrations[key].report) {
              this.logger.error(`The migration ${migration.node.source} has a different checksum. Was the file modified after migration?`);
            }
            break;
        }
      }
    } catch (error) {
      this.logger.error(error.message);
    }
  }
}
