/* eslint-disable no-await-in-loop */

import {Driver, RecordShape} from 'neo4j-driver'

import {BASELINE, MIGRATION_LABEL} from '../constants'
import {MigrationInfo, Neo4jMigrationNode} from '../types'
import {Logger} from './logger'

export class Repository {
  constructor(private readonly driver: Driver) {}

  async applyMigration(migration: Neo4jMigrationNode, fromVersion: string, duration: number): Promise<void> {
    const queries = [
      {
        parameters: {
          duration,
          fromVersion,
          properties: migration,
        },
        statement: `
          MATCH (m:${MIGRATION_LABEL} {version: $fromVersion})
          CREATE (m)-[r:MIGRATED_TO]->(new:${MIGRATION_LABEL} $properties)
          SET r.at = datetime({timezone: 'UTC'}), r.in = duration({milliseconds: $duration})
        `,
      },
    ]
    await this.executeQueries(queries)
  }

  async cleanConstraints(): Promise<void> {
    const schemaQueries = [
      {statement: `DROP CONSTRAINT unique_version_${MIGRATION_LABEL} IF EXISTS`},
      {statement: `DROP INDEX idx_version_${MIGRATION_LABEL} IF EXISTS`},
    ]
    await this.executeQueries(schemaQueries)
  }

  async cleanMigrations(): Promise<void> {
    const dataQueries = [
      {statement: `MATCH (:${MIGRATION_LABEL})-[r:MIGRATED_TO]->(m:${MIGRATION_LABEL}) DETACH DELETE m, r`},
      {statement: `MATCH (b:${MIGRATION_LABEL}) DETACH DELETE b`},
    ]
    await this.executeQueries(dataQueries)
  }

  async executeQueries(queries: Array<{parameters?: RecordShape; statement: string}>): Promise<void> {
    const session = this.driver.session()
    const transaction = session.beginTransaction()
    try {
      for (const query of queries) {
        Logger.debug(`Executing query: ${query.statement}`)
        if (query.parameters) {
          Logger.debug(`With parameters: ${JSON.stringify(query.parameters)}`)
        }

        await transaction.run(query.statement, query.parameters || {})
      }

      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      throw error
    } finally {
      await session.close()
    }
  }

  async getMigrationState(): Promise<{
    appliedMigrations: MigrationInfo[]
    baselineExists: boolean
    latestMigration: Neo4jMigrationNode | null
  }> {
    const queries = [
      {
        parameters: {version: BASELINE},
        statement: `MATCH (base:${MIGRATION_LABEL} {version: $version}) RETURN base`,
      },
      {
        statement: `
          MATCH (m:${MIGRATION_LABEL})
          WHERE NOT (m)-[:MIGRATED_TO]->(:${MIGRATION_LABEL})
          RETURN m LIMIT 1
        `,
      },
      {
        statement: `
          MATCH (${MIGRATION_LABEL})-[r:MIGRATED_TO]->(m:${MIGRATION_LABEL})
          RETURN m, r ORDER BY m.version
        `,
      },
    ]

    const session = this.driver.session()
    const transaction = session.beginTransaction()

    try {
      const baselineExistsResult = await transaction.run(queries[0].statement, queries[0].parameters)
      const latestMigrationResult = await transaction.run(queries[1].statement)
      const migrationsResult = await transaction.run(queries[2].statement)

      await transaction.commit()

      return {
        appliedMigrations: migrationsResult.records.map((record) => ({
          node: record.get('m').properties,
          relation: record.get('r').properties,
        })),
        baselineExists: baselineExistsResult.records.length > 0,
        latestMigration: latestMigrationResult.records[0]?.get('m').properties || null,
      }
    } catch (error) {
      await transaction.rollback()
      throw error
    } finally {
      await session.close()
    }
  }

  async initializeBaseline(): Promise<void> {
    const queries = [
      {
        parameters: {version: BASELINE},
        statement: `CREATE (base:${MIGRATION_LABEL} {version: $version})`,
      },
    ]
    await this.executeQueries(queries)
  }

  async initializeSchema(): Promise<void> {
    const schemaQueries = [
      {
        statement: `CREATE CONSTRAINT unique_version_${MIGRATION_LABEL} IF NOT EXISTS
                    FOR (m:${MIGRATION_LABEL}) REQUIRE m.version IS UNIQUE`,
      },
      {
        statement: `CREATE INDEX idx_version_${MIGRATION_LABEL} IF NOT EXISTS
                    FOR (m:${MIGRATION_LABEL}) ON (m.version)`,
      },
    ]
    await this.executeQueries(schemaQueries)
  }
}
