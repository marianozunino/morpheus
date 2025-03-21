import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {getRandomMigrationDir, cleanDirectory, setupTestEnvironment, createTestMigrations} from '../utils/test-helpers'
import {
  setupTestContainer,
  cleanupTestResources,
  getContainerConnectionArgs,
  runMigrationsOnContainer,
  verifyMigrationCount,
  MigrationTestContext,
} from '../utils/neo4j-test-setup'

describe('delete command', () => {
  let testContext: MigrationTestContext
  let commandResult: Awaited<ReturnType<typeof runCommand>>

  beforeEach(() => {
    setupTestEnvironment()
  })

  before(async () => {
    testContext = await setupTestContainer()
  })

  afterEach(function () {
    if (this.currentTest?.state === 'failed' && commandResult) {
      console.log('Failed test output:', commandResult)
    }
  })

  after(async () => {
    await cleanupTestResources(testContext)
  })

  beforeEach(async () => {
    await testContext.container.wipe()
  })

  it('should fail if no migration was found', async () => {
    const connectionArgs = ['-s', 'bolt', ...getContainerConnectionArgs(testContext.container)]

    commandResult = await runCommand(['delete', '1.0.0', ...connectionArgs])

    expect(commandResult.error?.message).to.contain('Delete operation failed: No migrations exist in the database')
  })

  it('should fail if the migration does not exist', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)
    cleanDirectory(randomDir)

    const migrationNames = await createTestMigrations(randomDir, 3)

    await runMigrationsOnContainer(testContext.container, randomDir, undefined, ['-s', 'bolt'])

    commandResult = await runCommand([
      'delete',
      '5.0.0',
      '-s',
      'bolt',
      ...getContainerConnectionArgs(testContext.container),
    ])

    expect(commandResult.error?.message).to.contain(
      'Delete operation failed: No migration found matching identifier: 5.0.0',
    )
  })

  it('deletes a migration at the end of the chain (3.0.0)', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)
    cleanDirectory(randomDir)

    const migrationNames = await createTestMigrations(randomDir, 3)

    await runMigrationsOnContainer(testContext.container, randomDir, undefined, ['-s', 'bolt'])

    await verifyMigrationCount(testContext.container, 4)

    commandResult = await runCommand([
      'delete',
      '3.0.0',
      '-s',
      'bolt',
      ...getContainerConnectionArgs(testContext.container),
      '-m',
      randomDir,
    ])

    expect(commandResult.stdout).to.contain('Deleting migration: V3_0_0__')
    expect(commandResult.stdout).to.contain('Migration deleted successfully')

    const session = testContext.container.session!
    const remainingMigrations = await session.run(
      `MATCH (m:__Neo4jMigration) RETURN m.version AS version ORDER BY m.version`,
    )
    const remainingVersions = remainingMigrations.records.map((record) => record.get('version'))

    expect(remainingVersions).to.include('BASELINE')
    expect(remainingVersions).to.include('1.0.0')
    expect(remainingVersions).to.include('2.0.0')
    expect(remainingVersions).to.not.include('3.0.0')

    const v1ToV2Result = await session.run(`
      MATCH (v1:__Neo4jMigration {version: '1.0.0'})-[r:MIGRATED_TO]->(v2:__Neo4jMigration {version: '2.0.0'})
      RETURN count(r) AS relationCount
    `)

    expect(v1ToV2Result.records[0].get('relationCount').toNumber()).to.equal(1)
  })

  it('deletes a migration in the middle of the chain (2.0.0)', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)
    cleanDirectory(randomDir)

    const migrationNames = await createTestMigrations(randomDir, 3)

    await runMigrationsOnContainer(testContext.container, randomDir, undefined, ['-s', 'bolt'])

    await verifyMigrationCount(testContext.container, 4)

    commandResult = await runCommand([
      'delete',
      '2.0.0',
      '-s',
      'bolt',
      ...getContainerConnectionArgs(testContext.container),
      '-m',
      randomDir,
    ])

    expect(commandResult.stdout).to.contain('Deleting migration: V2_0_0__')
    expect(commandResult.stdout).to.contain('Migration deleted successfully')

    const session = testContext.container.session!
    const remainingMigrations = await session.run(
      `MATCH (m:__Neo4jMigration) RETURN m.version AS version ORDER BY m.version`,
    )
    const remainingVersions = remainingMigrations.records.map((record) => record.get('version'))

    expect(remainingVersions).to.include('BASELINE')
    expect(remainingVersions).to.include('1.0.0')
    expect(remainingVersions).to.include('3.0.0')
    expect(remainingVersions).to.not.include('2.0.0')

    const relationshipResult = await session.run(`
      MATCH (v1:__Neo4jMigration {version: '1.0.0'})-[r:MIGRATED_TO]->(v3:__Neo4jMigration {version: '3.0.0'})
      RETURN count(r) AS relationCount
    `)

    expect(relationshipResult.records[0].get('relationCount').toNumber()).to.equal(1)
  })

  it('deletes a migration at the beginning of the chain (1.0.0)', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)
    cleanDirectory(randomDir)

    const migrationNames = await createTestMigrations(randomDir, 3)

    await runMigrationsOnContainer(testContext.container, randomDir, undefined, ['-s', 'bolt'])

    await verifyMigrationCount(testContext.container, 4)

    commandResult = await runCommand([
      'delete',
      '1.0.0',
      '-s',
      'bolt',
      ...getContainerConnectionArgs(testContext.container),
      '-m',
      randomDir,
    ])

    expect(commandResult.stdout).to.contain('Deleting migration: V1_0_0__')
    expect(commandResult.stdout).to.contain('Migration deleted successfully')

    const session = testContext.container.session!
    const remainingMigrations = await session.run(
      `MATCH (m:__Neo4jMigration) RETURN m.version AS version ORDER BY m.version`,
    )
    const remainingVersions = remainingMigrations.records.map((record) => record.get('version'))

    expect(remainingVersions).to.include('BASELINE')
    expect(remainingVersions).to.not.include('1.0.0')
    expect(remainingVersions).to.include('2.0.0')
    expect(remainingVersions).to.include('3.0.0')

    const baselineToV2Result = await session.run(`
      MATCH (b:__Neo4jMigration {version: 'BASELINE'})-[r:MIGRATED_TO]->(v2:__Neo4jMigration {version: '2.0.0'})
      RETURN count(r) AS relationCount
    `)

    expect(baselineToV2Result.records[0].get('relationCount').toNumber()).to.equal(1)

    const v2ToV3Result = await session.run(`
      MATCH (v2:__Neo4jMigration {version: '2.0.0'})-[r:MIGRATED_TO]->(v3:__Neo4jMigration {version: '3.0.0'})
      RETURN count(r) AS relationCount
    `)

    expect(v2ToV3Result.records[0].get('relationCount').toNumber()).to.equal(1)
  })

  it('deletes the only existing migration (1.0.0) - keeps BASELINE', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)
    cleanDirectory(randomDir)

    const migrationNames = await createTestMigrations(randomDir, 1)

    await runMigrationsOnContainer(testContext.container, randomDir, undefined, ['-s', 'bolt'])

    await verifyMigrationCount(testContext.container, 2)

    commandResult = await runCommand([
      'delete',
      '1.0.0',
      '-s',
      'bolt',
      ...getContainerConnectionArgs(testContext.container),
      '-m',
      randomDir,
    ])

    expect(commandResult.stdout).to.contain('Deleting migration: V1_0_0__')
    expect(commandResult.stdout).to.contain('Migration deleted successfully')

    const session = testContext.container.session!
    const remainingMigrations = await session.run(`MATCH (m:__Neo4jMigration) RETURN m.version AS version`)
    const remainingVersions = remainingMigrations.records.map((record) => record.get('version'))

    expect(remainingVersions).to.deep.equal(['BASELINE'])
    expect(remainingVersions).to.not.include('1.0.0')
  })

  it('supports dry run mode without modifying database', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)
    cleanDirectory(randomDir)

    const migrationNames = await createTestMigrations(randomDir, 2)

    await runMigrationsOnContainer(testContext.container, randomDir, undefined, ['-s', 'bolt'])

    await verifyMigrationCount(testContext.container, 3)

    commandResult = await runCommand([
      'delete',
      '2.0.0',
      '-s',
      'bolt',
      ...getContainerConnectionArgs(testContext.container),
      '-m',
      randomDir,
      '--dry-run',
    ])

    expect(commandResult.stdout).to.contain('Dry run')
    expect(commandResult.stdout).to.contain('Would delete migration:')
    expect(commandResult.stdout).to.contain('Version: 2.0.0')

    await verifyMigrationCount(testContext.container, 3)
  })
})
