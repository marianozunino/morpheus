import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {Neo4jTestContainer} from '../test-container'
import * as fs from 'fs-extra'
import * as path from 'node:path'
import {tmpdir} from 'os'
import {Logger} from '../../src/services/logger'

const chance = require('chance').Chance()

describe('delete', () => {
  let container: Neo4jTestContainer
  let configDir = path.join(tmpdir(), 'morpheus')
  let migrationsDir = path.join(configDir, 'migrations')
  let commandResult: Awaited<ReturnType<typeof runCommand>>

  beforeEach(() => {
    Logger.initialize() // Reset logger
  })

  afterEach(function () {
    if (this.currentTest?.state === 'failed' && commandResult) {
      console.log(commandResult)
    }
  })

  before(async () => {
    // Set up the Neo4j test container
    container = new Neo4jTestContainer()
    await container.start()

    // Clean up config and migrations directories if they exist
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, {recursive: true, force: true})
    }
  })

  after(async () => {
    // Stop the Neo4j container and clean up files
    await container.stop()
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, {recursive: true, force: true})
    }
  })

  beforeEach(async () => {
    await container.wipe()
  })

  it('should fail if no migration was found', async () => {
    const out = await runCommand([
      'delete',
      '1.0.0',
      '-p',
      container.getPort().toString(),
      '-h',
      container.getHost(),
      '-u',
      'neo4j',
      '-P',
      'password',
    ])
    commandResult = out
    expect(out.error?.message).to.contain('Delete operation failed: No migrations exist in the database')
  })

  it('should fail if the migration does not exist', async () => {
    const randomDir = `${migrationsDir}/${chance.word({length: 5})}/`

    const file1 = `migration-${chance.word({length: 4})}`
    const file2 = `migration-${chance.word({length: 4})}`
    const file3 = `migration-${chance.word({length: 4})}`

    await runCommand(['create', file1, '-m', randomDir])
    await runCommand(['create', file2, '-m', randomDir])
    await runCommand(['create', file3, '-m', randomDir])

    await runCommand([
      'migrate',
      '-p',
      container.getPort().toString(),
      '-h',
      container.getHost(),
      '-u',
      'neo4j',
      '-P',
      'password',
      '-m',
      randomDir,
    ])

    const out = await runCommand([
      'delete',
      '5.0.0',
      '-p',
      container.getPort().toString(),
      '-h',
      container.getHost(),
      '-u',
      'neo4j',
      '-P',
      'password',
    ])
    commandResult = out
    expect(out.error?.message).to.contain('Delete operation failed: No migration found matching identifier: 5.0.0')
  })

  it('deletes a migration at the end of the chain (3.0.0)', async () => {
    const confFile = `${configDir}/config.json`
    await runCommand(`init -c ${confFile}`)

    const randomDir = `${migrationsDir}/${chance.word({length: 5})}/`

    const file1 = `migration-${chance.word({length: 4})}`
    const file2 = `migration-${chance.word({length: 4})}`
    const file3 = `migration-${chance.word({length: 4})}`

    await runCommand(['create', file1, '-m', randomDir])
    await runCommand(['create', file2, '-m', randomDir])
    await runCommand(['create', file3, '-m', randomDir])

    await runCommand([
      'migrate',
      '-c',
      confFile,
      '-p',
      container.getPort().toString(),
      '-h',
      container.getHost(),
      '-u',
      'neo4j',
      '-P',
      'password',
      '-m',
      randomDir,
    ])

    // Assert that migrations have been applied
    const session = container.session!
    const result = await session.run(`MATCH (m:__Neo4jMigration) RETURN count(m) as migrationCount`)
    const migrationCount = result.records[0].get('migrationCount').toNumber()
    expect(migrationCount).to.equal(4) // Expecting 3 migrations to be applied + 1 Baseline

    // delete version 3.0.0
    const out2 = await runCommand([
      'delete',
      '3.0.0',
      '-p',
      container.getPort().toString(),
      '-h',
      container.getHost(),
      '-u',
      'neo4j',
      '-P',
      'password',
      '-m',
      randomDir,
    ])

    commandResult = out2

    expect(out2.stdout).to.contain('Deleting migration: V3_0_0__')
    expect(out2.stdout).to.contain('Migration deleted successfully')

    // Assert the remaining migrations
    const remainingMigrations = await session.run(
      `MATCH (m:__Neo4jMigration) RETURN m.version AS version ORDER BY m.createdAt`,
    )
    const remainingVersions = remainingMigrations.records.map((record) => record.get('version'))

    // Expecting only BASELINE, 1.0.0, and 2.0.0 to remain
    expect(remainingVersions).to.deep.equal(['BASELINE', '1.0.0', '2.0.0'])

    // Verify relationships: Check relationship between 1.0.0 and 2.0.0
    const version1ToVersion2Result = await session.run(`
      MATCH (v1:__Neo4jMigration {version: '1.0.0'})-[r:MIGRATED_TO]->(v2:__Neo4jMigration {version: '2.0.0'})
      RETURN count(r) AS relationCount
    `)

    const version1ToVersion2Count = version1ToVersion2Result.records[0].get('relationCount').toNumber()
    expect(version1ToVersion2Count).to.equal(1) // There should be exactly one relationship

    // Check relationship between BASELINE and 1.0.0
    const baselineToVersion1Result = await session.run(`
      MATCH (b:__Neo4jMigration {version: 'BASELINE'})-[r:MIGRATED_TO]->(v:__Neo4jMigration {version: '1.0.0'})
      RETURN count(r) AS relationCount
    `)

    const baselineToVersion1Count = baselineToVersion1Result.records[0].get('relationCount').toNumber()
    expect(baselineToVersion1Count).to.equal(1) // There should be exactly one relationship
  })

  it('deletes a migration in the middle of the chain (2.0.0)', async () => {
    const confFile = `${configDir}/config.json`
    await runCommand(`init -c ${confFile}`)

    const randomDir = `${migrationsDir}/${chance.word({length: 5})}/`

    const file1 = `migration-${chance.word({length: 4})}`
    const file2 = `migration-${chance.word({length: 4})}`
    const file3 = `migration-${chance.word({length: 4})}`

    await runCommand(['create', file1, '-m', randomDir])
    await runCommand(['create', file2, '-m', randomDir])
    await runCommand(['create', file3, '-m', randomDir])

    await runCommand([
      'migrate',
      '-c',
      confFile,
      '-p',
      container.getPort().toString(),
      '-h',
      container.getHost(),
      '-u',
      'neo4j',
      '-P',
      'password',
      '-m',
      randomDir,
    ])

    // Assert that migrations have been applied
    const session = container.session!
    const result = await session.run(`MATCH (m:__Neo4jMigration) RETURN count(m) as migrationCount`)
    const migrationCount = result.records[0].get('migrationCount').toNumber()
    expect(migrationCount).to.equal(4) // Expecting 3 migrations to be applied + 1 Baseline

    // delete version 2.0.0
    const out2 = await runCommand([
      'delete',
      '2.0.0',
      '-p',
      container.getPort().toString(),
      '-h',
      container.getHost(),
      '-u',
      'neo4j',
      '-P',
      'password',
      '-m',
      randomDir,
    ])

    commandResult = out2

    expect(out2.stdout).to.contain('Deleting migration: V2_0_0__')
    expect(out2.stdout).to.contain('Migration deleted successfully')

    // Assert the remaining migrations
    const remainingMigrations = await session.run(
      `MATCH (m:__Neo4jMigration) RETURN m.version AS version ORDER BY m.createdAt`,
    )
    const remainingVersions = remainingMigrations.records.map((record) => record.get('version'))

    // Expecting only BASELINE, 1.0.0, and 3.0.0 to remain
    expect(remainingVersions).to.deep.equal(['BASELINE', '1.0.0', '3.0.0'])

    // Verify relationships: Check relationship between BASELINE and 1.0.0
    const baselineToVersion1Result = await session.run(`
      MATCH (b:__Neo4jMigration {version: 'BASELINE'})-[r:MIGRATED_TO]->(v:__Neo4jMigration {version: '1.0.0'})
      RETURN count(r) AS relationCount
    `)

    const baselineToVersion1Count = baselineToVersion1Result.records[0].get('relationCount').toNumber()
    expect(baselineToVersion1Count).to.equal(1) // There should be exactly one relationship

    // Check relationship between 1.0.0 and 3.0.0
    const version1ToVersion3Result = await session.run(`
      MATCH (v1:__Neo4jMigration {version: '1.0.0'})-[r:MIGRATED_TO]->(v2:__Neo4jMigration {version: '3.0.0'})
      RETURN count(r) AS relationCount
    `)

    const version1ToVersion3Count = version1ToVersion3Result.records[0].get('relationCount').toNumber()
    expect(version1ToVersion3Count).to.equal(1) // There should be exactly one relationship
  })

  it('deletes a migration at the beginning of the chain (1.0.0)', async () => {
    const confFile = `${configDir}/config.json`
    await runCommand(`init -c ${confFile}`)

    const randomDir = `${migrationsDir}/${chance.word({length: 5})}/`

    const file1 = `migration-${chance.word({length: 4})}`
    const file2 = `migration-${chance.word({length: 4})}`
    const file3 = `migration-${chance.word({length: 4})}`

    await runCommand(['create', file1, '-m', randomDir])
    await runCommand(['create', file2, '-m', randomDir])
    await runCommand(['create', file3, '-m', randomDir])

    const out = await runCommand([
      'migrate',
      '-c',
      confFile,
      '-p',
      container.getPort().toString(),
      '-h',
      container.getHost(),
      '-u',
      'neo4j',
      '-P',
      'password',
      '-m',
      randomDir,
    ])

    commandResult = out
    expect(out.stdout).to.contain(file1)
    expect(out.stdout).to.contain(file2)
    expect(out.stdout).to.contain(file3)

    // Assert that migrations have been applied
    const session = container.session!
    const result = await session.run(`MATCH (m:__Neo4jMigration) RETURN count(m) as migrationCount`)
    const migrationCount = result.records[0].get('migrationCount').toNumber()
    expect(migrationCount).to.equal(4) // Expecting 3 migrations to be applied + 1 Baseline

    // Fetch all migration nodes and their relationships
    const migrationResults = await session.run(`
      MATCH (m:__Neo4jMigration)
      RETURN m.version AS version
      ORDER BY m.createdAt
    `)

    const versions = migrationResults.records.map((record) => record.get('version'))

    // Ensure the order is correct based on how they were created
    expect(versions).to.deep.equal(['BASELINE', '1.0.0', '2.0.0', '3.0.0'])

    // delete version 1.0.0
    const out2 = await runCommand([
      'delete',
      '1.0.0',
      '-p',
      container.getPort().toString(),
      '-h',
      container.getHost(),
      '-u',
      'neo4j',
      '-P',
      'password',
      '-m',
      randomDir,
    ])

    commandResult = out2

    expect(out2.stdout).to.contain('Deleting migration: V1_0_0__')
    expect(out2.stdout).to.contain('Migration deleted successfully')

    // Assert that only 3 migrations are left
    const result2 = await session.run(`MATCH (m:__Neo4jMigration) RETURN count(m) as migrationCount`)
    const migrationCount2 = result2.records[0].get('migrationCount').toNumber()
    expect(migrationCount2).to.equal(3)

    // Fetch all migration nodes and their relationships
    const migrationResults2 = await session.run(`
      MATCH (m:__Neo4jMigration)
      RETURN m.version AS version
      ORDER BY m.createdAt
    `)

    const versions2 = migrationResults2.records.map((record) => record.get('version'))

    // Ensure the order is correct based on how they were created
    expect(versions2).to.deep.equal(['BASELINE', '2.0.0', '3.0.0'])

    // Verify relationships between the migration nodes
    // Check relationship between BASELINE and 2.0.0
    const baselineToVersionResult = await session.run(`
      MATCH (b:__Neo4jMigration {version: 'BASELINE'})-[r:MIGRATED_TO]->(v:__Neo4jMigration {version: '2.0.0'})
      RETURN count(r) AS relationCount
    `)

    const baselineToVersionCount = baselineToVersionResult.records[0].get('relationCount').toNumber()
    expect(baselineToVersionCount).to.equal(1) // There should be exactly one relationship

    // Check relationship between 2.0.0 and 3.0.0
    const versionToNextResult = await session.run(`
      MATCH (v1:__Neo4jMigration {version: '2.0.0'})-[r:MIGRATED_TO]->(v2:__Neo4jMigration {version: '3.0.0'})
      RETURN count(r) AS relationCount
    `)

    const versionToNextCount = versionToNextResult.records[0].get('relationCount').toNumber()
    expect(versionToNextCount).to.equal(1) // There should be exactly one relationship
  })

  it('deletes the only existing migration (1.0.0) - keeps BASELINE', async () => {
    const confFile = `${configDir}/config.json`
    await runCommand(`init -c ${confFile}`)

    const randomDir = `${migrationsDir}/${chance.word({length: 5})}/`

    const file1 = `migration-${chance.word({length: 4})}`

    await runCommand(['create', file1, '-m', randomDir])

    const out = await runCommand([
      'migrate',
      '-c',
      confFile,
      '-p',
      container.getPort().toString(),
      '-h',
      container.getHost(),
      '-u',
      'neo4j',
      '-P',
      'password',
      '-m',
      randomDir,
    ])

    commandResult = out
    expect(out.stdout).to.contain(file1)

    // Assert that migrations have been applied
    const session = container.session!
    const result = await session.run(`MATCH (m:__Neo4jMigration) RETURN count(m) as migrationCount`)
    const migrationCount = result.records[0].get('migrationCount').toNumber()
    expect(migrationCount).to.equal(2) // Expecting 3 migrations to be applied + 1 Baseline

    // Fetch all migration nodes and their relationships
    const migrationResults = await session.run(`
      MATCH (m:__Neo4jMigration)
      RETURN m.version AS version
      ORDER BY m.createdAt
    `)

    const versions = migrationResults.records.map((record) => record.get('version'))

    // Ensure the order is correct based on how they were created
    expect(versions).to.deep.equal(['BASELINE', '1.0.0'])

    // delete version 1.0.0
    const out2 = await runCommand([
      'delete',
      '1.0.0',
      '-p',
      container.getPort().toString(),
      '-h',
      container.getHost(),
      '-u',
      'neo4j',
      '-P',
      'password',
      '-m',
      randomDir,
    ])

    commandResult = out2

    expect(out2.stdout).to.contain('Deleting migration: V1_0_0__')
    expect(out2.stdout).to.contain('Migration deleted successfully')

    // Assert that only 0 migrations are left
    const result2 = await session.run(`MATCH (m:__Neo4jMigration) RETURN count(m) as migrationCount`)
    const migrationCount2 = result2.records[0].get('migrationCount').toNumber()
    expect(migrationCount2).to.equal(1)

    // Fetch all migration nodes and their relationships
    const migrationResults2 = await session.run(`
      MATCH (m:__Neo4jMigration)
      RETURN m.version AS version
      ORDER BY m.createdAt
    `)

    const versions2 = migrationResults2.records.map((record) => record.get('version'))

    // Ensure the order is correct based on how they were created
    expect(versions2).to.deep.equal(['BASELINE'])
  })
})
