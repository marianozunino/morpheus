import assert from 'assert';
import { crc32 } from 'crc';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { join, resolve } from 'path';
import { Config } from './config';
import { Neo4j, Neo4jConfig } from './neo4j';
import { Repository } from './repository';
import { DEFAULT_MIGRATIONS_PATH, MORPHEUS_FILE_NAME } from './types';

export function generateChecksum(statements: string[]): string {
  const crcValue = statements.reduce((acc: number, statement) => {
    return crc32(statement, acc);
  }, undefined);

  return crcValue.toString();
}

// filename format: V<number>_<name>.cypher
/* istanbul ignore next */
export async function getFileNamesFromMigrationsFolder(): Promise<string[]> {
  const { migrationsPath } = Config.getConfig();
  const configPath = resolve(process.cwd(), migrationsPath);
  return readdirSync(configPath);
}

export function getMigrationDescription(fileName: string): string {
  const result = fileName.match(
    /^V(\d+(?:_\d+)*|\d+(?:\.\d+)*)__([\w ]+)(?:\.cypher)$/,
  );
  assert(result, 'Invalid file name');
  return result[2].replace(/_/g, ' ').trim();
}

export function getFileContentAndVersion(fileName: string): {
  version: string;
  fileContent: string;
} {
  const { migrationsPath } = Config.getConfig();
  const result = fileName.match(
    /^V(\d+(?:_\d+)*|\d+(?:\.\d+)*)__([\w ]+)(?:\.cypher)$/,
  );

  assert(result, `Invalid migration file name: ${fileName}`);

  const version = result[1].replace(/_/g, '.');
  const filePath = resolve(process.cwd(), migrationsPath, fileName);

  assert(
    existsSync(filePath),
    `Missing migration: ${fileName}. Neo4j reports it as applied, but it is missing locally.`,
  );
  const fileContent = readFileSync(filePath, 'utf8');

  return { version, fileContent };
}

export function createMigrationsFolder(): void {
  // create migrations folder
  const { migrationsPath } = Config.getConfig();
  if (!existsSync(migrationsPath)) {
    mkdirSync(migrationsPath, { recursive: true });
    console.log(`Migrations folder created: ${migrationsPath}`);
  }
}

export function createMorpheusFile(): void {
  const defaultConfig: Neo4jConfig = {
    host: 'localhost',
    port: 7687,
    username: 'neo4j',
    password: 'neo4j',
    scheme: 'neo4j',
    migrationsPath: DEFAULT_MIGRATIONS_PATH,
  };
  writeFileSync(MORPHEUS_FILE_NAME, JSON.stringify(defaultConfig, null, 2));
  console.log(`Morpheus file created: ${MORPHEUS_FILE_NAME}`);
}

export async function generateMigrationVersion(): Promise<string> {
  const fileNames = await getFileNamesFromMigrationsFolder();

  const latestVersion = fileNames.reduce((acc, fileName) => {
    const { version } = getFileContentAndVersion(fileName);
    return version > acc ? version : acc;
  }, '0.0.0');

  // increment first digit
  const latestVersionArray = latestVersion.split('.').map(Number)[0];
  return `${latestVersionArray + 1}_0_0`;
}

export async function generateMigration(fileName: string) {
  const { migrationsPath } = Config.getConfig();
  createMigrationsFolder();
  const newVersion = await generateMigrationVersion();
  const fileNameWithPrefix = `V${newVersion}__${fileName}.cypher`;
  const filePath = join(migrationsPath, fileNameWithPrefix);

  const fileContent = `CREATE (agent:\`007\`) RETURN agent;`;
  writeFileSync(filePath, fileContent);
  console.log(`Migration file created: ${filePath}`);
}

export function splitFileContentIntoStatements(fileContent: string): string[] {
  return fileContent
    .split(/;(:?\r?\n|\r)/)
    .map((statement) => statement.trim().replace(/;$/, ''))
    .filter((statement) => statement !== '');
}

export async function repositoryFactory(): Promise<Repository> {
  const connection = await Neo4j.getConnection();
  const repository = new Repository(connection);
  return repository;
}

export async function asyncExecutionWrapper(
  ...executables: (() => Promise<unknown>)[]
): Promise<void> {
  try {
    for (const executable of executables) {
      await executable();
    }
  } catch (error) {
    console.error(error.message);
  } finally {
    process.exit(0);
  }
}

export function executionWrapper(...executables: CallableFunction[]): void {
  try {
    executables.forEach((executable) => executable());
  } catch (error) {
    console.error(error.message);
  } finally {
    process.exit(0);
  }
}
