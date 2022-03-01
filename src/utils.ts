import assert from 'assert';
import { crc32 } from 'crc';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { resolve } from 'path';
import { Neo4j, Neo4jConfig } from './neo4j';
import { Repository } from './repository';

export function generateChecksum(statements: string[]): string {
  const crcValue = statements.reduce((acc: number, statement) => {
    return crc32(statement, acc);
  }, undefined);

  return crcValue.toString();
}

// filename format: V<number>_<name>.cypher
/* istanbul ignore next */
export async function getFileNamesFromMigrationsFolder(): Promise<string[]> {
  const configPath = resolve(process.cwd(), 'neo4j/migrations');
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
  const result = fileName.match(
    /^V(\d+(?:_\d+)*|\d+(?:\.\d+)*)__([\w ]+)(?:\.cypher)$/,
  );

  assert(result, 'Invalid file name');

  const version = result[1].replace(/_/g, '.');
  const filePath = resolve(process.cwd(), 'neo4j/migrations', fileName);

  assert(existsSync(filePath), `Migration ${fileName} not found`);
  const fileContent = readFileSync(filePath, 'utf8');

  return { version, fileContent };
}

export function createMigrationsFolder(): void {
  // create migrations folder
  const folderPath = `./neo4j/migrations`;
  if (!existsSync(folderPath)) {
    mkdirSync(folderPath, { recursive: true });
    console.log(`Migrations folder created: ${folderPath}`);
  }
}

export function createMorpheusFile(): void {
  // create morpheus file
  const filePath = `.morpheus.json`;
  const fileContent = `{
  "scheme": "neo4j",
  "host": "localhost",
  "port": 7687,
  "username": "neo4j",
  "password": "neo4j"
}`;
  writeFileSync(filePath, fileContent);
  console.log(`Morpheus file created: ${filePath}`);
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
  const newVersion = await generateMigrationVersion();
  const fileNameWithPrefix = `V${newVersion}__${fileName}.cypher`;
  const filePath = `./neo4j/migrations/${fileNameWithPrefix}`;
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
