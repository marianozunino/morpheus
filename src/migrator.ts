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

      const startTime = new Date().getTime();
      console.log(`Executing migration: ${migrationName}`);
      const trx = this.connection.session().beginTransaction();
      const statements = this.getFileStatements(fileContent);
      for (const statement of statements) {
        if (statement.trim() !== '') {
          await trx.run(statement);
        }
      }
      const endTime = new Date().getTime();

      const migrationQuery = this.buildMigrationQuery(
        migrationId,
        fileName,
        fileContent,
        migrationName,
        endTime - startTime,
      );
      await trx.run(migrationQuery);
      await trx.commit();

      this.latestMigrationId = migrationId;
    }
  }

  private getFileStatements(fileContent: string): string[] {
    return fileContent.split(';');
  }

  private buildMigrationQuery(
    migrationId: string,
    source: string,
    fileContent: string,
    description: string,
    duration: number,
  ): string {
    const checksum = generateChecksum(fileContent);
    return this.connection
      .query()
      .matchNode('migration', this.MigrationNode)
      .where({ 'migration.version': this.latestMigrationId })
      .with('migration')
      .create([
        node('migration'),
        relation('out', 'r', 'MIGRATED_TO'),
        node('newMigration', this.MigrationNode, {
          version: migrationId,
          description,
          source,
          checksum,
          type: 'CYPHER',
        }),
      ])
      .raw(
        'SET r.at = datetime({timezone: "UTC"}), r.in = duration({milliseconds: $duration})',
        { duration: duration },
      )
      .return('newMigration')
      .interpolate();
  }

  private async getCandidateMigrations(): Promise<string[]> {
    const fileNames = await getFileNamesFromMigrationsFolder();
    const candidateMigrations = fileNames.filter((fileName) => {
      let f = fileName;
      if (f.startsWith('V')) {
        f = f.substr(1);
      }
      return (
        (this.latestMigrationId == 'BASELINE' ||
          f.split('_')[0] > this.latestMigrationId) &&
        f.endsWith('.cypher')
      );
    });
    return candidateMigrations;
  }

  private async verifyChecksumOfOldMigrations(): Promise<void> {
    const rows = await this.connection
      .query()
      .raw(
        `MATCH (b:__Neo4jMigration {version:'BASELINE'}) - [r:MIGRATED_TO*] -> (l:__Neo4jMigration)
         WHERE NOT (l)-[:MIGRATED_TO]->(:__Neo4jMigration)
         RETURN DISTINCT l`,
      )
      .run();
    for (const row of rows) {
      const {
        l: {
          properties: { source, checksum },
        },
      } = row;
      this.verifyMigrationChecksum(source, checksum);
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
      .raw('WHERE NOT (migration)-[:MIGRATED_TO]->(:__Neo4jMigration)')
      .return('migration')
      .limit(1)
      .run();
    this.latestMigrationId = latestMigration.migration.properties.version;
  }

  private async assertBaseNodeExists(): Promise<void> {
    const [baseNode] = await this.connection
      .query()
      .matchNode('base', this.MigrationNode)
      .where({ 'base.version': 'BASELINE' })
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
      `CREATE CONSTRAINT unique_id_${this.MigrationNode} IF NOT exists ON (p:${this.MigrationNode}) ASSERT p.version IS UNIQUE;`,
    );
    await trx.run(
      `CREATE INDEX idx_id_${this.MigrationNode} IF NOT exists FOR (p:${this.MigrationNode}) ON (p.version);`,
    );
    await trx.commit();
  }

  private async createBaseNode(): Promise<void> {
    await this.connection
      .query()
      .createNode('base', this.MigrationNode, { id: 0, version: 'BASELINE' })
      .run();
  }
}
