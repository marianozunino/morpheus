import { Connection, node, Node, relation } from 'cypher-query-builder';
import { Transaction } from 'neo4j-driver-core/types';
import {
  Neo4jMigrationNode,
  MigrationLabel,
  BASELINE,
  Neo4jMigrationRelation,
  MigrationInfo,
} from './types';

export class Repository {
  constructor(private readonly connection: Connection) {}

  public async fetchBaselineNode(): Promise<Neo4jMigrationNode> {
    const [baseNode] = await this.connection
      .query()
      .matchNode('base', MigrationLabel)
      .where({ 'base.version': BASELINE })
      .return('base')
      .run<Node<Neo4jMigrationNode>>();
    return baseNode?.base?.properties;
  }

  public async executeQueries(
    queries: string[],
    trx?: Transaction,
  ): Promise<void> {
    if (trx) {
      for (const statement of queries) {
        await trx.run(statement);
      }
    } else {
      for (const statement of queries) {
        await this.connection.raw(statement).run();
      }
    }
  }
  public async getLatestMigration(): Promise<Neo4jMigrationNode> {
    const [latestMigration] = await this.connection
      .query()
      .matchNode('migration', MigrationLabel)
      .raw(`WHERE NOT (migration)-[:MIGRATED_TO]->(:${MigrationLabel})`)
      .return('migration')
      .raw(`LIMIT 1`)
      .run<Node<Neo4jMigrationNode>>();

    return latestMigration?.migration?.properties;
  }

  public async createConstraints(): Promise<void> {
    await this.executeQueries([
      `CREATE CONSTRAINT unique_version_${MigrationLabel} IF NOT exists ON (m:${MigrationLabel}) ASSERT m.version IS UNIQUE`,
      `CREATE INDEX idx_version_${MigrationLabel} IF NOT exists FOR (m:${MigrationLabel}) ON (m.version)`,
    ]);
  }

  public async createBaseNode(): Promise<void> {
    await this.connection
      .query()
      .createNode('base', MigrationLabel, { version: BASELINE })
      .run();
  }

  public async getPreviousMigrations(): Promise<Neo4jMigrationNode[]> {
    const rows = await this.connection
      .query()
      .raw(
        `MATCH (b:${MigrationLabel} {version:"${BASELINE}"}) - [r:MIGRATED_TO*] -> (l:${MigrationLabel})
         WHERE NOT (l)-[:MIGRATED_TO]->(:${MigrationLabel})
         RETURN DISTINCT l`,
      )
      .run<Node<Neo4jMigrationNode>>();

    return rows.map((row) => row.l.properties);
  }

  public async executeQuery(query: string, trx?: Transaction): Promise<void> {
    return this.executeQueries([query], trx);
  }

  public buildMigrationQuery(
    neo4jMigration: Neo4jMigrationNode,
    fromVersion: string,
    duration: number,
  ): string {
    return this.connection
      .query()
      .matchNode('migration', MigrationLabel)
      .where({ 'migration.version': fromVersion })
      .with('migration')
      .create([
        node('migration'),
        relation('out', 'r', 'MIGRATED_TO'),
        node('newMigration', MigrationLabel, neo4jMigration),
      ])
      .raw(
        'SET r.at = datetime({timezone: "UTC"}), r.in = duration({milliseconds: $duration})',
        { duration },
      )
      .return('newMigration')
      .interpolate()
      .replace(/;$/, '');
  }

  public async getMigrationInfo(): Promise<MigrationInfo[]> {
    const nodes = await this.connection
      .query()
      .match([
        node(MigrationLabel),
        relation('out', 'r', 'MIGRATED_TO'),
        node('migration', MigrationLabel),
      ])
      .return(['migration', 'r'])
      .run<Node<Neo4jMigrationNode & Neo4jMigrationRelation>>();

    return nodes.map((node) => ({
      node: node.migration.properties,
      relation: node.r.properties,
    }));
  }

  public getTransaction(): Transaction {
    return this.connection.session().beginTransaction();
  }
}
