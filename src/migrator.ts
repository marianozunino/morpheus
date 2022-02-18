import { Connection, node, relation } from 'cypher-query-builder';
import { Neo4j } from './neo4j';
import {
  generateChecksum,
  getFileContentAndId,
  getFileNamesFromMigrationsFolder,
  getMigrationName,
} from './utils';

export class Migrator {
  private connection: Connection;
  private latestMigrationId: string;
  private readonly MigrationNode = '__Neo4jMigration';

  public async migrate() {
    this.connection = await Neo4j.getConnection();
    await this.assertBaseNodeExists();
    await this.getLatestMigration();
    await this.verifyChecksumOfOldMigrations();
    const candidateMigrations = await this.getCandidateMigrations();

    if (candidateMigrations.length === 0) {
      console.log('Database is up to date');
    }
    for (const fileName of candidateMigrations) {
      const { migrationId, fileContent } = getFileContentAndId(fileName);
      const migrationName = getMigrationName(fileName);

      const migrationQuery = this.buildMigrationQuery(
        migrationId,
        fileName,
        fileContent,
        migrationName,
      );

      console.log(`Executing migration: ${migrationName}`);
      const trx = this.connection.session().beginTransaction();
      await trx.run(migrationQuery);
      const statements = this.getFileStatements(fileContent);
      for (const statement of statements) {
        if (statement.trim() !== '') {
          await trx.run(statement);
        }
      }
      await trx.commit();
      this.latestMigrationId = migrationId;
    }
  }

  private getFileStatements(fileContent: string): string[] {
    return fileContent.split(';');
  }

  private buildMigrationQuery(
    migrationId: string,
    fileName: string,
    fileContent: string,
    name: string,
  ): string {
    const checksum = generateChecksum(fileContent);
    return this.connection
      .query()
      .matchNode('migration', this.MigrationNode)
      .where({ 'migration.id': this.latestMigrationId })
      .with('migration')
      .create([
        node('migration'),
        relation('out', ':MIGRATED_TO', {
          date: new Date().getTime().toString(),
        }),
        node('newMigration', this.MigrationNode, {
          id: migrationId,
          name,
          fileName,
          checksum,
        }),
      ])
      .return('newMigration')
      .interpolate();
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
    const rows = await this.connection
      .query()
      .raw(
        ` MATCH (migration:__Neo4jMigration)
  WHERE toInteger(migration.id) <= toInteger(${this.latestMigrationId})
  AND migration.checksum IS NOT NULL
  RETURN migration`,
      )
      .run();
    for (const row of rows) {
      const {
        migration: {
          properties: { fileName, checksum },
        },
      } = row;
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
    const [latestMigration] = await this.connection
      .query()
      .matchNode('migration', this.MigrationNode)
      .return('migration')
      .orderBy('toInteger(migration.id)', 'DESC')
      .limit(1)
      .run();
    this.latestMigrationId = latestMigration.migration.properties.id;
  }

  private async assertBaseNodeExists(): Promise<void> {
    const [baseNode] = await this.connection
      .query()
      .matchNode('base', this.MigrationNode)
      .where({ 'base.id': 0 })
      .return('base')
      .run();
    if (!baseNode) {
      await this.createConstraints();
      await this.createBaseNode();
    }
  }

  async createConstraints(): Promise<void> {
    const trx = this.connection.session().beginTransaction();
    await trx.run(
      `CREATE CONSTRAINT unique_id_${this.MigrationNode} IF NOT exists ON (p:${this.MigrationNode}) ASSERT p.id IS UNIQUE;`,
    );
    await trx.run(
      `CREATE INDEX idx_id_${this.MigrationNode} IF NOT exists FOR (p:${this.MigrationNode}) ON (p.id);`,
    );
    await trx.commit();
  }

  private async createBaseNode(): Promise<void> {
    await this.connection
      .query()
      .createNode('base', this.MigrationNode, { id: 0, name: 'BASELINE' })
      .run();
  }
}
