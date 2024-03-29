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

export type FileInfo = {
  version: string;
  fileName: string;
  description: string;
};

export type InitOptions = {
  force?: boolean;
};

export enum MigrationState {
  PENDING = 'PENDING',
  APPLIED = 'APPLIED',
}
