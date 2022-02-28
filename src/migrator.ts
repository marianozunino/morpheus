import { Neo4j } from './neo4j';
import { Repository } from './repository';
import { BASELINE, Neo4jMigrationNode } from './types';
import {
  generateChecksum,
  getFileContentAndVersion,
  getFileNamesFromMigrationsFolder,
  getMigrationDescription,
  splitFileContentIntoStatements,
} from './utils';

export class Migrator {
  private latestMigrationVersion: string;
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
    const { version, fileContent } = getFileContentAndVersion(fileName);
    const description = getMigrationDescription(fileName);
    const statements = splitFileContentIntoStatements(fileContent);

    console.log(`Executing migration: ${description}`);
    const trx = this.repository.getTransaction();
    const startTime = new Date().getTime();
    await this.repository.executeQueries(statements, trx);
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

    const migrationQuery = this.repository.buildMigrationQuery(
      migrationNode,
      this.latestMigrationVersion,
      duration,
    );

    await this.repository.executeQuery(migrationQuery);

    this.latestMigrationVersion = version;
  }

  private async initializeRepository() {
    const connection = await Neo4j.getConnection();
    this.repository = new Repository(connection);
  }

  private async getCandidateMigrations(): Promise<string[]> {
    const fileNames = await getFileNamesFromMigrationsFolder();

    const candidateMigrations = fileNames.filter((fileName) => {
      const version = getFileContentAndVersion(fileName).version;
      return (
        this.latestMigrationVersion === BASELINE ||
        version > this.latestMigrationVersion
      );
    });

    return candidateMigrations;
  }

  private async verifyChecksumOfOldMigrations(): Promise<void> {
    const migrations = await this.repository.getPreviousMigrations();
    for (const row of migrations) {
      const { source: fileName, checksum } = row;
      this.verifyMigrationChecksum(fileName, checksum);
    }
  }

  private verifyMigrationChecksum(fileName: string, previousChecksum: string) {
    const { fileContent } = getFileContentAndVersion(fileName);
    const statements = splitFileContentIntoStatements(fileContent);
    const checksum = generateChecksum(statements);
    if (previousChecksum !== checksum) {
      console.error(
        `ERROR: the checksum of ${fileName} does not match the checksum in the database`,
      );
      process.exit(1);
    }
  }
  private async getLatestMigration(): Promise<void> {
    const { version } = await this.repository.getLatestMigration();
    this.latestMigrationVersion = version;
  }

  private async assertBaseNodeExists(): Promise<void> {
    const baseNode = await this.repository.fetchBaselineNode();
    if (!baseNode) {
      await this.repository.createConstraints();
      await this.repository.createBaseNode();
    }
  }
}
