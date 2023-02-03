import { rm, mkdirp, writeFile, readdir } from 'fs-extra';

export const simplePath = 'simplePath';
export const nestedPath = 'nestedPath/one';
import { Connection } from 'cypher-query-builder';
import {
  DEFAULT_MIGRATIONS_PATH,
  MORPHEUS_FILE_NAME,
} from '../src/app.constants';
import { Neo4jConfig } from 'src/config/config-loader';

let connection: Connection;

export const cleanUp = async (): Promise<void> => {
  await Promise.all([
    rm('.morpheus.json', {
      force: true,
    }),
    rm('neo4j', { recursive: true, force: true }),
    rm(simplePath, { recursive: true, force: true }),
    rm(nestedPath, { recursive: true, force: true }),
  ]);

  await connection.query().raw('CALL apoc.schema.assert({}, {})').run();
  await connection.query().raw('MATCH (n) DETACH DELETE n').run();
};

export const closeNeo4j = async (): Promise<void> => {
  await connection.close();
};

export const openNeo4j = async (): Promise<void> => {
  const host = process.env.TEST_NEO4J_HOST;
  const port = process.env.TEST_NEO4J_PORT;
  const username = process.env.TEST_NEO4J_USERNAME;
  const password = process.env.TEST_NEO4J_PASSWORD;
  const scheme = process.env.TEST_NEO4J_SCHEME;

  connection = new Connection(`${scheme}://${host}:${port}`, {
    username: username,
    password: password,
  });
};

export const createNeo4jConfigFile = async (
  neo4jConfig?: Partial<
    Neo4jConfig & {
      path?: typeof simplePath | typeof nestedPath;
    }
  >,
): Promise<void> => {
  const file = {
    host: neo4jConfig?.host ?? process.env.TEST_NEO4J_HOST,
    port: neo4jConfig?.port ?? process.env.TEST_NEO4J_PORT,
    username: neo4jConfig?.username ?? process.env.TEST_NEO4J_USERNAME,
    password: neo4jConfig?.password ?? process.env.TEST_NEO4J_PASSWORD,
    scheme: neo4jConfig?.scheme ?? process.env.TEST_NEO4J_SCHEME,
    migrationsPath: neo4jConfig?.path ?? DEFAULT_MIGRATIONS_PATH,
  };

  await writeFile(MORPHEUS_FILE_NAME, JSON.stringify(file, null, 2));
};

export const createMigrationFile = async (): Promise<void> => {
  await mkdirp(DEFAULT_MIGRATIONS_PATH);
  const files = await readdir(DEFAULT_MIGRATIONS_PATH);
  const lastMigration = files[files.length - 1];

  const lastMigrationNumber = !!lastMigration
    ? +lastMigration.split('_')[0].slice(1)
    : 0;

  const newMigrationNumber = lastMigrationNumber + 1;
  const newMigrationName = `V${lastMigrationNumber}_0_0__${newMigrationNumber}.cypher`;
  const fileContent = `CREATE (agent:\`007\`) RETURN agent;`;
  await writeFile(
    `${DEFAULT_MIGRATIONS_PATH}/${newMigrationName}`,
    fileContent,
  );
};
