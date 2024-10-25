import {z} from 'zod'

export enum Neo4jScheme {
  BOLT = 'bolt',
  BOLT_SECURE = 'bolt+s',
  BOLT_SECURE_SELF_SIGNED = 'bolt+ssc',
  NEO4J = 'neo4j',
  NEO4J_SECURE = 'neo4j+s',
  NEO4J_SECURE_SELF_SIGNED = 'neo4j+ssc',
}

export const Neo4jConfigSchema = z.object({
  database: z.string().optional(),
  host: z.string().min(1),
  migrationsPath: z.string().optional(),
  password: z.string().min(1),
  port: z.number().int().positive(),
  scheme: z.nativeEnum(Neo4jScheme),
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
  force?: boolean
  template?: string
}

export type MigrationInfo = {
  node: Neo4jMigrationNode
  relation: Neo4jMigrationRelation
}

export type Neo4jMigrationRelation = {
  at: At
  in: In
}

export type At = {
  day: number
  hour: number
  minute: number
  month: number
  nanosecond: number
  second: number
  timeZoneId: string
  timeZoneOffsetSeconds: string
  year: number
}

export type In = {
  days: number
  months: number
  nanoseconds: number
  seconds: number
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
