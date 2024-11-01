import {DateTime, Duration} from 'neo4j-driver'
import {z} from 'zod'

import {DEFAULT_MIGRATIONS_PATH} from './constants'

export enum Neo4jScheme {
  BOLT = 'bolt',
  BOLT_SECURE = 'bolt+s',
  BOLT_SECURE_SELF_SIGNED = 'bolt+ssc',
  NEO4J = 'neo4j',
  NEO4J_SECURE = 'neo4j+s',
  NEO4J_SECURE_SELF_SIGNED = 'neo4j+ssc',
}

export enum TransactionMode {
  /**
   * Run all statements in one transaction. May need more memory, but it's generally safer. Either the migration runs as a whole or not at all.
   */
  PER_MIGRATION = 'PER_MIGRATION',
  /**
   * Runs each statement in a separate transaction. May leave your database in an inconsistent state when one statement fails.
   */
  PER_STATEMENT = 'PER_STATEMENT',
}

export const Neo4jConfigSchema = z.object({
  database: z.string().optional(),
  host: z.string().min(1),
  migrationsPath: z.string().default(DEFAULT_MIGRATIONS_PATH).optional(),
  password: z.string().min(1),
  port: z.number().int().positive(),
  scheme: z.nativeEnum(Neo4jScheme),
  transactionMode: z.nativeEnum(TransactionMode).default(TransactionMode.PER_STATEMENT).optional(),
  username: z.string().min(1),
})

export type Neo4jConfig = z.infer<typeof Neo4jConfigSchema>

export interface Neo4jMigrationNode {
  checksum: string
  description: string
  source: string
  type: 'CYPHER'
  version: string
}

export interface MigrationOptions {
  dryRun?: boolean
  transactionMode?: TransactionMode
}

export type MigrationInfo = {
  node: Neo4jMigrationNode
  relation: Neo4jMigrationRelation
}

export type Neo4jMigrationRelation = {
  at: DateTime
  in: Duration
}

export type FileInfo = {
  description: string
  fileName: string
  version: string
}

export type InitOptions = {
  force?: boolean
}

export enum MigrationState {
  APPLIED = 'APPLIED',
  PENDING = 'PENDING',
}

export interface MigrationTableRow {
  Description: string
  ExecutionTime: string
  InstalledOn: string
  Source: string
  State: MigrationState
  Type: string
  Version: string
}
