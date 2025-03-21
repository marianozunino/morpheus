import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import * as fs from 'fs-extra'
import * as path from 'node:path'
import {tmpdir} from 'os'
import {getRandomMigrationDir, cleanDirectory, setupTestEnvironment, createTestMigrations} from '../utils/test-helpers'
import {
  setupTestContainer,
  cleanupTestResources,
  verifyMigrationCount,
  MigrationTestContext,
} from '../utils/neo4j-test-setup'

describe('info command', () => {
  let testContext: MigrationTestContext
  let commandResult: Awaited<ReturnType<typeof runCommand>>

  beforeEach(() => {
    setupTestEnvironment()
  })

  before(async () => {
    testContext = await setupTestContainer()
  })

  after(async () => {
    await cleanupTestResources(testContext)
  })

  afterEach(function () {
    if (this.currentTest?.state === 'failed' && commandResult) {
      console.log('Failed test output:', commandResult)
    }
  })

  beforeEach(async () => {
    await testContext.container.wipe()
  })

  it('fails when configuration is invalid', async () => {
    const nonExistentConfig = path.join(tmpdir(), `nonexistent-${Date.now()}.json`)
    commandResult = await runCommand(['info', '-c', nonExistentConfig])
    expect(commandResult.error?.message).to.contain('Configuration validation failed')
  })

  it('fails with appropriate errors for database connection issues', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)
    cleanDirectory(randomDir)

    {
      commandResult = await runCommand([
        'info',
        '-s',
        'bolt',
        '-p',
        testContext.container.getPort().toString(),
        '-h',
        testContext.container.getHost(),
        '-u',
        'neo4j',
        '-P',
        'wrong-password',
        '-m',
        randomDir,
      ])
      expect(commandResult.error?.message).to.contain('unauthorized due to authentication failure')
    }

    {
      commandResult = await runCommand([
        'info',
        '-s',
        'bolt',
        '-p',
        testContext.container.getPort().toString(),
        '-h',
        'invalid-host',
        '-u',
        'neo4j',
        '-P',
        'password',
        '-m',
        randomDir,
      ])
      expect(commandResult.error?.message).to.contain('Failed to connect')
    }

    {
      commandResult = await runCommand([
        'info',
        '-s',
        'bolt',
        '-p',
        '42069',
        '-h',
        testContext.container.getHost(),
        '-u',
        'neo4j',
        '-P',
        'password',
        '-m',
        randomDir,
      ])
      expect(commandResult.error?.message).to.contain('Failed to connect')
    }
  })

  it('reports when there are no migrations', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)
    cleanDirectory(randomDir)

    commandResult = await runCommand([
      'info',
      '-s',
      'bolt',
      '-p',
      testContext.container.getPort().toString(),
      '-h',
      testContext.container.getHost(),
      '-u',
      'neo4j',
      '-P',
      'password',
      '-m',
      randomDir,
    ])

    expect(commandResult.stdout).to.contain(
      'Database is up to date, but there are no migrations in the migrations folder',
    )
  })

  it('displays information about applied migrations', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)
    cleanDirectory(randomDir)

    const migrationNames = await createTestMigrations(randomDir, 2)

    await runCommand([
      'migrate',
      '-s',
      'bolt',
      '-p',
      testContext.container.getPort().toString(),
      '-h',
      testContext.container.getHost(),
      '-u',
      'neo4j',
      '-P',
      'password',
      '-m',
      randomDir,
    ])

    await verifyMigrationCount(testContext.container, 3)

    commandResult = await runCommand([
      'info',
      '-s',
      'bolt',
      '-p',
      testContext.container.getPort().toString(),
      '-h',
      testContext.container.getHost(),
      '-u',
      'neo4j',
      '-P',
      'password',
      '-m',
      randomDir,
    ])

    for (const name of migrationNames) {
      expect(commandResult.stdout).to.contain(name)
    }
    expect(commandResult.stdout).not.to.contain('PENDING')

    expect(commandResult.stdout).to.contain('Version')
    expect(commandResult.stdout).to.contain('Description')
    expect(commandResult.stdout).to.contain('ExecutionTime')
    expect(commandResult.stdout).to.contain('State')
    expect(commandResult.stdout).to.contain('APPLIED')
  })

  it('displays both applied and pending migrations', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)
    cleanDirectory(randomDir)

    const firstBatch = await createTestMigrations(randomDir, 2)

    await runCommand([
      'migrate',
      '-s',
      'bolt',
      '-p',
      testContext.container.getPort().toString(),
      '-h',
      testContext.container.getHost(),
      '-u',
      'neo4j',
      '-P',
      'password',
      '-m',
      randomDir,
    ])

    const pendingMigration = await createTestMigrations(randomDir, 1, 2)

    commandResult = await runCommand([
      'info',
      '-s',
      'bolt',
      '-p',
      testContext.container.getPort().toString(),
      '-h',
      testContext.container.getHost(),
      '-u',
      'neo4j',
      '-P',
      'password',
      '-m',
      randomDir,
    ])

    for (const name of firstBatch) {
      expect(commandResult.stdout).to.contain(name)
    }
    for (const name of pendingMigration) {
      expect(commandResult.stdout).to.contain(name)
    }

    expect(commandResult.stdout).to.contain('PENDING')
    expect(commandResult.stdout).to.contain('APPLIED')
  })

  it('reports when there are more migrations in database than in folder', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)
    cleanDirectory(randomDir)

    const migrationNames = await createTestMigrations(randomDir, 2)

    await runCommand([
      'migrate',
      '-s',
      'bolt',
      '-p',
      testContext.container.getPort().toString(),
      '-h',
      testContext.container.getHost(),
      '-u',
      'neo4j',
      '-P',
      'password',
      '-m',
      randomDir,
    ])

    fs.emptyDirSync(randomDir)

    commandResult = await runCommand([
      'info',
      '-s',
      'bolt',
      '-p',
      testContext.container.getPort().toString(),
      '-h',
      testContext.container.getHost(),
      '-u',
      'neo4j',
      '-P',
      'password',
      '-m',
      randomDir,
    ])

    expect(commandResult.stderr).to.contain('There are more migrations in the database than in the migrations folder')

    expect(commandResult.stdout).to.contain('Existing migrations:')
  })
})
