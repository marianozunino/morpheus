import { Inject, Injectable } from '@nestjs/common';
import { Connection, node, Node, relation } from 'cypher-query-builder';
import { Transaction } from 'neo4j-driver-core';
import { CONNECTION_TOKEN, BASELINE, MIGRATION_LABEL } from '../app.constants';
import {
  Neo4jMigrationNode,
  Neo4jMigrationRelation,
  MigrationInfo,
} from '../types';

@Injectable()
export class Repository {
  public constructor(
    @Inject(CONNECTION_TOKEN)
    private readonly neo4j: Connection,
  ) {}

  public async fetchBaselineNode(): Promise<Neo4jMigrationNode> {
    const [baseNode] = await this.neo4j
      .query()
      .matchNode('base', MIGRATION_LABEL)
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
        await this.neo4j.raw(statement).run();
      }
    }
  }
  public async getLatestMigration(): Promise<Neo4jMigrationNode> {
    const [latestMigration] = await this.neo4j
      .query()
      .matchNode('migration', MIGRATION_LABEL)
      .raw(`WHERE NOT (migration)-[:MIGRATED_TO]->(:${MIGRATION_LABEL})`)
      .return('migration')
      .raw(`LIMIT 1`)
      .run<Node<Neo4jMigrationNode>>();

    return latestMigration?.migration?.properties;
  }

  public async createConstraints(): Promise<void> {
    await this.executeQueries([
      `CREATE CONSTRAINT unique_version_${MIGRATION_LABEL} IF NOT exists FOR (m:${MIGRATION_LABEL}) REQUIRE m.version IS UNIQUE`,
      `CREATE INDEX idx_version_${MIGRATION_LABEL} IF NOT exists FOR (m:${MIGRATION_LABEL}) ON (m.version)`,
    ]);
  }

  public async createBaseNode(): Promise<void> {
    await this.neo4j
      .query()
      .createNode('base', MIGRATION_LABEL, { version: BASELINE })
      .run();
  }

  public async getPreviousMigrations(): Promise<Neo4jMigrationNode[]> {
    const rows = await this.neo4j
      .query()
      .raw(
        `MATCH (b:${MIGRATION_LABEL} {version:"${BASELINE}"}) - [r:MIGRATED_TO*] -> (l:${MIGRATION_LABEL})
         WHERE NOT (l)-[:MIGRATED_TO]->(:${MIGRATION_LABEL})
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
    return this.neo4j
      .query()
      .matchNode('migration', MIGRATION_LABEL)
      .where({ 'migration.version': fromVersion })
      .with('migration')
      .create([
        node('migration'),
        relation('out', 'r', 'MIGRATED_TO'),
        node('newMigration', MIGRATION_LABEL, neo4jMigration),
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
    const nodes = await this.neo4j
      .query()
      .match([
        node(MIGRATION_LABEL),
        relation('out', 'r', 'MIGRATED_TO'),
        node('migration', MIGRATION_LABEL),
      ])
      .return(['migration', 'r'])
      .run<Node<Neo4jMigrationNode & Neo4jMigrationRelation>>();

    return nodes
      .map((node) => ({
        node: node.migration.properties,
        relation: node.r.properties,
      }))
      .sort((a, b) =>
        a.node.version.localeCompare(b.node.version, undefined, {
          numeric: true,
          sensitivity: 'base',
        }),
      );
  }

  public getTransaction(): Transaction {
    return this.neo4j.session().beginTransaction() as unknown as Transaction;
  }
}
