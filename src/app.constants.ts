export const STARTING_VERSION = '0.0.0';
export const MIGRATION_LABEL = '__Neo4jMigration';
export const BASELINE = 'BASELINE';
export const DEFAULT_MIGRATIONS_PATH = 'neo4j/migrations';
export const MORPHEUS_FILE_NAME = '.morpheus.json';

export const MIGRATION_NAME_REGEX =
  /^V(?<version>\d+(?:_\d+)*|\d+(?:\.\d+)*)__(?<description>[\w ]+)(?:\.cypher)$/;

export const GLOBAL_CONFIG_TOKEN = 'GLOBAL_CONFIG_TOKEN';
export const CONNECTION_TOKEN = 'CONNECTION_TOKEN';
export const ENV_CONFIG_TOKEN = 'DATABASE_CONFIG';
