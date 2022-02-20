export type Neo4jMigration = {
  id: string;
  name: string;
  checksum: string;
  fileName: string;
};

export const MigrationLabel = '__Neo4jMigration' as const;

export const BASELINE = 'BASELINE' as const;
