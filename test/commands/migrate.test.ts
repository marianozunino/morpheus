import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import * as fs from 'fs-extra'
import sinon from 'sinon'
import * as neo4j from 'neo4j-driver'
import {
  getRandomMigrationDir,
  setupTestEnvironment,
  initTestConfig,
  createTestMigrations,
  getMigrationPathFromOutput,
} from '../utils/test-helpers'
import {
  setupTestContainer,
  cleanupTestResources,
  runMigrationsOnContainer,
  verifyMigrationCount,
  MigrationTestContext,
} from '../utils/neo4j-test-setup'

describe('migrate command', () => {
  let testContext: MigrationTestContext
  let commandResult: Awaited<ReturnType<typeof runCommand>>

  before(async () => {
    testContext = await setupTestContainer()
    await initTestConfig(testContext.configFile)
  })

  beforeEach(async () => {
    setupTestEnvironment()
    await testContext.container.wipe()
  })

  afterEach(function () {
    if (this.currentTest?.state === 'failed' && commandResult) {
      console.log('Failed test output:', commandResult)
    }
    sinon.restore()
  })

  after(async () => {
    await cleanupTestResources(testContext)
  })

  it('reports database up to date when no migrations exist', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)

    commandResult = await runMigrationsOnContainer(testContext.container, randomDir, testContext.configFile)

    expect(commandResult.stdout).to.contain('Database is up to date')

    await verifyMigrationCount(testContext.container, 1)
  })

  it('successfully applies multiple migrations in order', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)

    const migrationNames = await createTestMigrations(randomDir, 3)

    commandResult = await runMigrationsOnContainer(testContext.container, randomDir, testContext.configFile)

    for (const name of migrationNames) {
      expect(commandResult.stdout).to.contain(name)
    }

    await verifyMigrationCount(testContext.container, 4)
  })

  it('only runs new migrations when some already applied', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)

    const firstBatch = await createTestMigrations(randomDir, 2)

    await runMigrationsOnContainer(testContext.container, randomDir, testContext.configFile)

    await verifyMigrationCount(testContext.container, 3)

    const secondBatch = await createTestMigrations(randomDir, 2, 2)

    commandResult = await runMigrationsOnContainer(testContext.container, randomDir, testContext.configFile)

    for (const name of firstBatch) {
      expect(commandResult.stdout).to.not.contain(name)
    }

    for (const name of secondBatch) {
      expect(commandResult.stdout).to.contain(name)
    }

    await verifyMigrationCount(testContext.container, 5)
  })

  it('prevents migration when files are modified (checksum mismatch)', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)

    const result = await runCommand(['create', 'test-migration', '-m', randomDir])
    const migrationPath = getMigrationPathFromOutput(result.stdout)

    await runMigrationsOnContainer(testContext.container, randomDir, testContext.configFile)

    await verifyMigrationCount(testContext.container, 2)

    fs.writeFileSync(migrationPath, 'CREATE (n:Modified) RETURN n;')

    await runCommand(['create', 'second-migration', '-m', randomDir])

    commandResult = await runMigrationsOnContainer(testContext.container, randomDir, testContext.configFile)

    await verifyMigrationCount(testContext.container, 2)
  })

  it('performs dry run without modifying database', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)

    const migrationNames = await createTestMigrations(randomDir, 2)

    commandResult = await runMigrationsOnContainer(testContext.container, randomDir, testContext.configFile, [
      '--dry-run',
    ])

    expect(commandResult.stdout).to.contain('Dry run - no changes will be made to the database')

    for (const name of migrationNames) {
      expect(commandResult.stdout).to.contain(name)
    }

    await verifyMigrationCount(testContext.container, 1)
  })

  it('fails if using a directory missing previously applied migrations', async () => {
    const firstDir = getRandomMigrationDir(testContext.configDir)

    await createTestMigrations(firstDir, 2)
    await runMigrationsOnContainer(testContext.container, firstDir, testContext.configFile)

    const secondDir = getRandomMigrationDir(testContext.configDir)

    commandResult = await runMigrationsOnContainer(testContext.container, secondDir, testContext.configFile)
    expect(commandResult.error?.message).to.include('Neo4j reports it as applied, but it is missing locally')
  })

  describe('transaction modes', () => {
    let commitSpy: sinon.SinonSpy

    beforeEach(() => {
      commitSpy = sinon.stub(neo4j.Transaction.prototype, 'commit').callThrough()
    })

    it('uses per-migration transactions by default', async () => {
      const randomDir = getRandomMigrationDir(testContext.configDir)

      await runMigrationsOnContainer(testContext.container, randomDir, testContext.configFile)

      const result = await runCommand(['create', 'multi-statement', '-m', randomDir])
      const migrationPath = getMigrationPathFromOutput(result.stdout)

      fs.appendFileSync(
        migrationPath,
        `
CREATE (x:Node {name: "test1"});
CREATE (y:Node {name: "test2"});
CREATE (z:Node {name: "test3"});`,
      )

      commitSpy.resetHistory()

      commandResult = await runMigrationsOnContainer(testContext.container, randomDir, testContext.configFile, [
        '--transaction-mode=PER_MIGRATION',
      ])

      expect(commitSpy.callCount).to.equal(2)
    })

    it('uses per-statement transactions when specified', async () => {
      const randomDir = getRandomMigrationDir(testContext.configDir)

      await runMigrationsOnContainer(testContext.container, randomDir, testContext.configFile)

      const result = await runCommand(['create', 'multi-statement', '-m', randomDir])
      const migrationPath = getMigrationPathFromOutput(result.stdout)

      fs.appendFileSync(
        migrationPath,
        `
CREATE (x:Node {name: "test1"});
CREATE (y:Node {name: "test2"});
CREATE (z:Node {name: "test3"});`,
      )

      commitSpy.resetHistory()

      commandResult = await runMigrationsOnContainer(testContext.container, randomDir, testContext.configFile, [
        '--transaction-mode=PER_STATEMENT',
      ])

      expect(commitSpy.callCount).to.equal(5)
    })
  })
})
