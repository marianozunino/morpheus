import {runCommand} from '@oclif/test'
import * as fs from 'fs-extra'
import * as path from 'node:path'
import {tmpdir} from 'os'
import {Logger} from '../../src/services/logger'

/**
 * Generates a random temporary directory path for testing
 */
export function getTempDir(prefix = 'morpheus-test-'): string {
  return path.join(tmpdir(), `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 15)}`)
}

/**
 * Creates a random migration directory path
 */
export function getRandomMigrationDir(baseDir: string): string {
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  return path.join(baseDir, `migrations-${randomSuffix}`)
}

/**
 * Ensures a directory is clean (deleted if exists and created fresh)
 */
export function cleanDirectory(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, {recursive: true, force: true})
  }
  fs.mkdirSync(dirPath, {recursive: true})
}

/**
 * Initialize a test config file
 */
export async function initTestConfig(configFilePath: string): Promise<void> {
  await runCommand(`init -c ${configFilePath} --force`)
}

/**
 * Create multiple test migrations
 */
export async function createTestMigrations(
  migrationsPath: string,
  count: number = 3,
  startingNumber = 0,
): Promise<string[]> {
  const migrationNames: string[] = []

  for (let i = 1; i <= count; i++) {
    const name = `test-migration-${i + startingNumber}`
    migrationNames.push(name)
    await runCommand(['create', name, '-m', migrationsPath])
  }

  return migrationNames
}

/**
 * Gets the path of the created migration file from command output
 */
export function getMigrationPathFromOutput(output: string): string {
  const match = output.match(/Migration file created: (.+)/)
  if (!match) {
    throw new Error('Could not extract migration file path from output')
  }
  return match[1].trim()
}

/**
 * Prepares test environment with logging setup
 */
export function setupTestEnvironment(debug = false): void {
  Logger.initialize(false, debug)
}
