export type InitOptions = {
  force?: boolean;
};

export interface MorpheusConfig {
  /**
   * Path to the migrations folder
   * @default './neo4j/migrations'
   **/
  migrationsPath?: string;
}

export enum Neo4jScheme {
  NEO4J = 'neo4j',
  NEO4J_S = 'neo4j+s',
  NEO4J_SSC = 'neo4j+ssc',
  BOLT = 'bolt',
  BOLT_S = 'bolt+s',
  BOLT_SSC = 'bolt+ssc',
}

export interface Neo4jConfig {
  database?: string;
  scheme: Neo4jScheme;
  host: string;
  port: number;
  username: string;
  password: string;

  /**
   * Path to the migrations folder
   * @default './neo4j/migrations'
   **/
  migrationsPath?: string;
}

export type At = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  nanosecond: number;
  timeZoneOffsetSeconds: string;
  timeZoneId: string;
};

export type In = {
  months: number;
  days: number;
  seconds: number;
  nanoseconds: number;
};

export type MigrationInfo = {
  node: Neo4jMigrationNode;
  relation: Neo4jMigrationRelation;
};

export type Neo4jMigrationRelation = {
  at: At;
  in: In;
};

export type Neo4jMigrationNode = {
  version: string;
  description: string;
  checksum: string;
  source: string;
  type: 'CYPHER';
};

export type FileInfo = {
  version: string;
  fileName: string;
  description: string;
};

export enum MigrationState {
  PENDING = 'PENDING',
  APPLIED = 'APPLIED',
}
