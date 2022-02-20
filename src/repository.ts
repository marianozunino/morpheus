import { Connection, node, Node, relation } from 'cypher-query-builder';
import { Transaction } from 'neo4j-driver-core';
import { Neo4jMigration, MigrationLabel, BASELINE } from './types';

export class Repository {
  constructor(private readonly connection: Connection) {}

  public async fetchBaselineNode(): Promise<Neo4jMigration> {
    const [baseNode] = await this.connection
      .query()
      .matchNode('base', MigrationLabel)
      .where({ 'base.id': 0 })
      .return('base')
      .run<Node<Neo4jMigration>>();
    return baseNode?.base?.properties;
  }

  public async executeQueries(
    queries: string[],
    useTransaction = true,
  ): Promise<void> {
    if (useTransaction) {
      const trx = this.getTransaction();
      for (const statement of queries) {
        await trx.run(statement);
      }
      await trx.commit();
    } else {
      for (const statement of queries) {
        await this.connection.raw(statement).run();
      }
    }
  }

  public async getLatestMigration(): Promise<Neo4jMigration> {
    const [latestMigration] = await this.connection
      .query()
      .matchNode('migration', MigrationLabel)
      .return('migration')
      .orderBy('toInteger(migration.id)', 'DESC')
      .limit(1)
      .run<Node<Neo4jMigration>>();
    return latestMigration?.migration?.properties;
  }

  public async createConstraints(): Promise<void> {
    await this.executeQueries([
      `CREATE CONSTRAINT unique_id_${MigrationLabel} IF NOT exists ON (p:${MigrationLabel}) ASSERT p.id IS UNIQUE;`,
      `CREATE INDEX idx_id_${MigrationLabel} IF NOT exists FOR (p:${MigrationLabel}) ON (p.id);`,
    ]);
  }

  public async createBaseNode(): Promise<void> {
    await this.connection
      .query()
      .createNode('base', MigrationLabel, { id: 0, name: BASELINE })
      .run();
  }

  public async getPreviousMigrations(
    migrationId: string,
  ): Promise<Neo4jMigration[]> {
    const rows = await this.connection
      .query()
      .raw(
        `MATCH (migration:__Neo4jMigration)
  WHERE toInteger(migration.id) <= toInteger(${migrationId})
  AND migration.checksum IS NOT NULL
  RETURN migration`,
      )
      .run<Node<Neo4jMigration>>();
    return rows.map((row) => row.migration.properties);
  }

  public async executeQuery(
    query: string,
    useTransaction = false,
  ): Promise<void> {
    return this.executeQueries([query], useTransaction);
  }

  public buildMigrationQuery(
    neo4jMigration: Neo4jMigration,
    fromId: string,
  ): string {
    return this.connection
      .query()
      .matchNode('migration', MigrationLabel)
      .where({ 'migration.id': fromId })
      .with('migration')
      .create([
        node('migration'),
        relation('out', ':MIGRATED_TO', {
          date: new Date().getTime().toString(),
        }),
        node('newMigration', MigrationLabel, neo4jMigration),
      ])
      .return('newMigration')
      .interpolate();
  }

  private getTransaction(): Transaction {
    return this.connection.session().beginTransaction();
  }
}
