import { Injectable } from '@nestjs/common';
import { BASELINE, FsService, Logger, MigrationInfo, Neo4jMigrationNode, ChecksumService, VALIDATION_ERROR_KIND, ERROR_KIND } from '../..';

import { RepositoryService } from '../repository/repository.service';

@Injectable()
export class MigrationService {
  private latestAppliedVersion: string;
  private readonly logger = new Logger(MigrationService.name);

  constructor(
    private readonly fsService: FsService,
    private readonly repository: RepositoryService,
  ) {}

  public async migrate(): Promise<void> {
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
    this.logger.log(`Preparing migration: ${fileName}`);
    const fileContent = await this.fsService.getFileContent(fileName);
    const version = this.fsService.getMigrationVersionFromFileName(fileName);
    const description = this.fsService.getMigrationDescriptionFromFileName(fileName);

    const statements = this.splitFileContentIntoStatements(fileContent);

    this.logger.log(`Executing migration: ${fileName}`);

    const trx = this.repository.getTransaction();
    const startTime = new Date().getTime();

    await this.repository.executeQueries(statements, trx);

    const endTime = new Date().getTime();
    const duration = endTime - startTime;
    await trx.commit();

    const migrationNode: Neo4jMigrationNode = {
      version,
      description,
      checksum: ChecksumService.generateChecksum(statements),
      source: fileName,
      type: 'CYPHER',
    };

    const migrationQuery = this.repository.buildMigrationQuery(migrationNode, this.latestAppliedVersion, duration);

    await this.repository.executeQuery(migrationQuery);

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

  private async getLocalMigrations(): Promise<string[]> {
    const fileNames = await this.fsService.getFileNamesFromMigrationsFolder();

    // sort migrations by version. eg: 1.1.1 < 1.1.2 < 1.2.1 < 2.1.1 < 2.9.1 < 2.10.1 < 2.11.0
    return fileNames.sort((a, b) => {
      const versionA = this.fsService.getMigrationVersionFromFileName(a);
      const versionB = this.fsService.getMigrationVersionFromFileName(b);
      return versionA.localeCompare(versionB, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });
  }

  private async validateMigrationsIntegrity(): Promise<void> {
    const migrations = await this.repository.getMigrationInfo();
    for (const row of migrations) {
      const { source: fileName, checksum } = row.node;
      if (!(await this.isValidChecksum(fileName, checksum))) {
        throw new Error(`The checksum of ${fileName} does not match the checksum in the database`);
      }
    }
  }

  // The validate operations resolves all local migrations and checks whether all have applied in the same order and in the same version to the configured database.
  // A target database will validate as valid when all migrations have been applied in the right order and
  // invalid in any cases where migrations are missing, have not been applied, applied in a different order or with a different checksum.
  public async reportMigrationsIntegrity(): Promise<{
    [k in ERROR_KIND]: {
      report: MigrationInfo[];
    };
  }> {
    const appliedMigrations = await this.repository.getMigrationInfo();
    const localMigrations = await this.getLocalMigrations();

    // 1 - Are migrations missing?
    const missingMigrations = this.validateMissingMigrations(appliedMigrations, localMigrations);

    // 2 - Are migrations that have not been applied?
    const nonApplied = this.validateNonAppliedMigrations(appliedMigrations, localMigrations);

    // 3 - Are migrations applied in a different order?
    const wrongOrder = this.validateOrder(appliedMigrations, localMigrations);

    // 4 - Are migrations applied with a different checksum?
    const crcMismatch = await this.validateCRC(appliedMigrations);

    return {
      [VALIDATION_ERROR_KIND.MISSING]: {
        report: missingMigrations,
      },
      [VALIDATION_ERROR_KIND.NON_APPLIED]: {
        report: nonApplied,
      },
      [VALIDATION_ERROR_KIND.MISMATCH_ORDER]: {
        report: wrongOrder,
      },
      [VALIDATION_ERROR_KIND.MISMATCH_CHECKSUM]: {
        report: crcMismatch,
      },
    };
  }

  private validateMissingMigrations(appliedMigrations: MigrationInfo[], localMigrations: string[]): MigrationInfo[] {
    // report the nodes that are in the database but not in the local migrations
    const missingMigrations = appliedMigrations.filter((appliedMigration) => {
      return !localMigrations.includes(appliedMigration.node.source);
    });

    return missingMigrations;
  }

  private validateNonAppliedMigrations(appliedMigrations: MigrationInfo[], localMigrations: string[]): MigrationInfo[] {
    // report the nodes that are in the local migrations but not in the database
    const nonAppliedMigrations = localMigrations.filter((localMigration) => {
      return !appliedMigrations.some(
        (appliedMigration) =>
          appliedMigration.node.source === localMigration &&
          appliedMigration.node.version === this.fsService.getMigrationVersionFromFileName(localMigration),
      );
    });

    // build fake nodes for the report
    const fakeNodes = nonAppliedMigrations.map((nonAppliedMigration) => {
      return this.buildFakeNode(nonAppliedMigration);
    });
    return fakeNodes;
  }

  private buildFakeNode(nonAppliedMigration: string): { node: Neo4jMigrationNode; relation: null } {
    const node: Neo4jMigrationNode = {
      version: this.fsService.getMigrationVersionFromFileName(nonAppliedMigration),
      description: this.fsService.getMigrationDescriptionFromFileName(nonAppliedMigration),
      checksum: 'N/A',
      source: nonAppliedMigration,
      type: 'CYPHER',
    };

    return {
      node,
      relation: null,
    };
  }

  private validateOrder(appliedMigrations: MigrationInfo[], localMigrations: string[]): [MigrationInfo, MigrationInfo] {
    // report as soon as the order is not the same
    for (let i = 0; i < appliedMigrations.length; i++) {
      const appliedMigration = appliedMigrations[i];

      if (i >= localMigrations.length) {
        return [appliedMigration, null];
      }

      const localMigration = localMigrations[i];

      if (
        appliedMigration.node.source !== localMigration ||
        appliedMigration.node.version !== this.fsService.getMigrationVersionFromFileName(localMigration)
      ) {
        return [appliedMigration, this.buildFakeNode(localMigration)];
      }
    }
  }

  private async validateCRC(appliedMigrations: MigrationInfo[]): Promise<MigrationInfo[]> {
    // report the nodes that have a different checksum
    const invalidChecksums = [];
    for (const appliedMigration of appliedMigrations) {
      const { source: fileName, checksum } = appliedMigration.node;
      try {
        if (!(await this.isValidChecksum(fileName, checksum))) {
          invalidChecksums.push(appliedMigration);
        }
      } catch (error) {
        invalidChecksums.push(appliedMigration);
      }
    }

    return invalidChecksums;
  }

  private async isValidChecksum(fileName: string, previousChecksum: string): Promise<boolean> {
    const fileContent = await this.fsService.getFileContent(fileName);
    const statements = this.splitFileContentIntoStatements(fileContent);
    const checksum = ChecksumService.generateChecksum(statements);
    return previousChecksum === checksum;
  }

  private async getLatestAppliedVersion(): Promise<string> {
    const { version } = await this.repository.getLatestMigration();
    this.latestAppliedVersion = version;
    return version;
  }

  private async assertBaseNodeExists(): Promise<void> {
    const baseNode = await this.repository.fetchBaselineNode();
    if (!baseNode) {
      await this.repository.createConstraints();
      await this.repository.createBaseNode();
    }
  }

  private splitFileContentIntoStatements(fileContent: string): string[] {
    return fileContent
      .split(/;(:?\r?\n|\r)/)
      .map((statement) => statement.trim().replace(/;$/, ''))
      .filter((statement) => statement !== '');
  }
}
