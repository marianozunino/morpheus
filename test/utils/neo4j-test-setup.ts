import {runCommand} from '@oclif/test'
import path from 'path'
import {Neo4jTestContainer} from '../test-container'
import {expect} from 'chai'
import {getTempDir, cleanDirectory} from './test-helpers'
import * as fs from 'fs'

export interface MigrationTestContext {
  container: Neo4jTestContainer
  configDir: string
  migrationsDir: string
  configFile: string
}

/**
 * Sets up Neo4j test container and test directories
 */
export async function setupTestContainer(): Promise<MigrationTestContext> {
  const configDir = getTempDir()
  const migrationsDir = path.join(configDir, 'migrations')
  const configFile = path.join(configDir, 'config.json')

  cleanDirectory(configDir)

  const container = new Neo4jTestContainer()
  await container.start()

  return {
    container,
    configDir,
    migrationsDir,
    configFile,
  }
}

/**
 * Cleans up test resources
 */
export async function cleanupTestResources(context: MigrationTestContext): Promise<void> {
  if (context.container) {
    await context.container.stop()
  }

  if (fs.existsSync(context.configDir)) {
    fs.rmSync(context.configDir, {recursive: true, force: true})
  }
}

/**
 * Get base command arguments for connecting to container
 */
export function getContainerConnectionArgs(container: Neo4jTestContainer): string[] {
  return ['-p', container.getPort().toString(), '-h', container.getHost(), '-u', 'neo4j', '-P', 'password']
}

/**
 * Run migrations on container with specified migration path
 */
export async function runMigrationsOnContainer(
  container: Neo4jTestContainer,
  migrationsPath: string,
  configFile?: string,
  additionalArgs: string[] = [],
): Promise<Awaited<ReturnType<typeof runCommand>>> {
  const args = ['migrate', '-m', migrationsPath, ...getContainerConnectionArgs(container), ...additionalArgs]

  if (configFile) {
    args.push('-c', configFile)
  }

  return runCommand(args)
}

/**
 * Verify migration count in Neo4j
 */
export async function verifyMigrationCount(container: Neo4jTestContainer, expectedCount: number): Promise<void> {
  const session = container.session!
  const result = await session.run(`MATCH (m:__Neo4jMigration) RETURN count(m) as migrationCount`)
  const migrationCount = result.records[0].get('migrationCount').toNumber()
  expect(migrationCount).to.equal(expectedCount)
}
