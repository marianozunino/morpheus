import { Neo4j } from './neo4j';
import { Repository } from './repository';
import { Neo4jMigration } from './types';
import {
  generateChecksum,
  getFileContentAndId,
  getFileNamesFromMigrationsFolder,
  getMigrationName,
} from './utils';

export class Migrator {
  private latestMigrationId: string;
  private repository: Repository;

  public async migrate() {
    await this.initializeRepository();
    await this.assertBaseNodeExists();
    await this.getLatestMigration();
    await this.verifyChecksumOfOldMigrations();
    const candidateMigrations = await this.getCandidateMigrations();

    if (candidateMigrations.length === 0) {
      console.log('Database is up to date');
    }

    for (const fileName of candidateMigrations) {
      await this.prepareAndMigrateFile(fileName);
    }
  }

  private async prepareAndMigrateFile(fileName: string): Promise<void> {
    const { migrationId, fileContent } = getFileContentAndId(fileName);
    const migrationName = getMigrationName(fileName);
    const migrationNode = this.buildNeo4jMigrationNode(
      migrationId,
      fileName,
      fileContent,
      migrationName,
    );

    const statements = this.getFileStatements(fileContent);

    const migrationNodeQuery = this.repository.buildMigrationQuery(
      migrationNode,
      this.latestMigrationId,
    );
    statements.unshift(migrationNodeQuery);

    console.log(`Executing migration: ${migrationName}`);
    await this.repository.executeQueries(statements);
    this.latestMigrationId = migrationId;
  }

  private async initializeRepository() {
    const connection = await Neo4j.getConnection();
    this.repository = new Repository(connection);
  }

  private getFileStatements(fileContent: string): string[] {
    return fileContent
      .split(';')
      .filter((statement) => statement.trim() !== '');
  }

  private buildNeo4jMigrationNode(
    migrationId: string,
    fileName: string,
    fileContent: string,
    name: string,
  ): Neo4jMigration {
    const checksum = generateChecksum(fileContent);
    return {
      id: migrationId,
      name,
      checksum,
      fileName,
    };
  }

  private async getCandidateMigrations(): Promise<string[]> {
    const fileNames = await getFileNamesFromMigrationsFolder();
    const candidateMigrations = fileNames.filter(
      (fileName) =>
        fileName.split('_')[0] > this.latestMigrationId &&
        fileName.endsWith('.cypher'),
    );
    return candidateMigrations;
  }

  private async verifyChecksumOfOldMigrations(): Promise<void> {
    const migrations = await this.repository.getPreviousMigrations(
      this.latestMigrationId,
    );
    for (const row of migrations) {
      const { fileName, checksum } = row;
      this.verifyMigrationChecksum(fileName, checksum);
    }
  }

  private verifyMigrationChecksum(fileName: string, previousChecksum: string) {
    const { fileContent } = getFileContentAndId(fileName);
    const checksum = generateChecksum(fileContent);
    if (previousChecksum !== checksum) {
      console.error(
        `ERROR: the checksum of ${fileName} does not match the checksum in the database`,
      );
      process.exit(1);
    }
  }

  private async getLatestMigration(): Promise<void> {
    const { id } = await this.repository.getLatestMigration();
    this.latestMigrationId = id;
  }

  private async assertBaseNodeExists(): Promise<void> {
    const baseNode = await this.repository.fetchBaselineNode();
    if (!baseNode) {
      await this.repository.createConstraints();
      await this.repository.createBaseNode();
    }
  }
}
