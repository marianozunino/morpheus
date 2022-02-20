export type Neo4jMigration = {
  id: string;
  name: string;
  checksum: string;
  fileName: string;
};

export const MigrationNode = '__Neo4jMigration' as const;
