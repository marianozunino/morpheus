export type MigrationInfo = {
  node: Neo4jMigrationNode;
  relation: Neo4jMigrationRelation;
};
export type Neo4jMigrationRelation = {
  at: At;
  in: In;
};

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

export type Neo4jMigrationNode = {
  version: string;
  description: string;
  checksum: string;
  source: string;
  type: 'CYPHER';
};

export const MigrationLabel = '__Neo4jMigration';

export const BASELINE = 'BASELINE';

export const DEFAULT_MIGRATIONS_PATH = 'neo4j/migrations';

export const MORPHEUS_FILE_NAME = '.morpheus.json';
