export type Neo4jMigrationNode = {
  version: string;
  description: string;
  checksum: string;
  source: string;
  type: 'CYPHER';
};

export const MigrationLabel = '__Neo4jMigration' as const;

export const BASELINE = 'BASELINE' as const;
