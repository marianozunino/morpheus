import assert from 'assert';
import { createHash } from 'crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { resolve } from 'path';

/* istanbul ignore next */
export function generateChecksum(fileContent: string): string {
  return createHash('md5').update(fileContent, 'utf8').digest('hex');
}

// filename format: <timestamp>_<name>.cypher
/* istanbul ignore next */
export async function getFileNamesFromMigrationsFolder(): Promise<string[]> {
  const configPath = resolve(process.cwd(), 'neo4j/migrations');
  return readdirSync(configPath);
}

export function getMigrationName(fileName: string): string {
  const result = fileName.match(/^(\d{13})_(\w+)\.cypher$/) as string[];
  assert(result && result.length === 3, 'Invalid file name');
  return result[2];
}

export function getFileContentAndId(fileName: string): {
  migrationId: string;
  fileContent: string;
} {
  const result = fileName.match(/^(\d{13})_\w+\.cypher$/) as string[];
  assert(result, 'Invalid file name');
  const [, migrationId] = result;
  const filePath = resolve(process.cwd(), 'neo4j/migrations', fileName);

  assert(existsSync(filePath), `Migration ${fileName} not found`);
  const fileContent = readFileSync(filePath, 'utf8');

  return { migrationId, fileContent };
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

export function generateMigration(fileName: string) {
  // create migration file
  const filePrefix = new Date().getTime();
  const fileNameWithPrefix = `${filePrefix}_${fileName}.cypher`;
  const filePath = `./neo4j/migrations/${fileNameWithPrefix}`;
  const fileContent = `CREATE (agent:\`007\`) RETURN agent;
    UNWIND RANGE(1,6) AS i
    WITH i CREATE (n:OtherAgents {idx: '00' + i})
    RETURN n;`;
  writeFileSync(filePath, fileContent);
  console.log(`Migration file created: ${filePath}`);
}
