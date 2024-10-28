import {runCommand} from '@oclif/test'
import sinon from 'sinon'
import {expect} from 'chai'
import * as neo4j from 'neo4j-driver'

import {Neo4jTestContainer} from '../test-container'
import * as fs from 'fs-extra'
import * as path from 'node:path'
import {tmpdir} from 'os'
import {Logger} from '../../src/services/logger'

const chance = require('chance').Chance()

describe('migrate', () => {
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

  it('Prints ok if it up to date', async () => {
    const confFile = `${configDir}/config.json`

    const randomDir = `${migrationsDir}/${chance.word({length: 10})}`

    // Initialize configuration
    await runCommand(`init -c ${confFile}`)

    // Run migrate command
    const out = await runCommand([
      'migrate',
      '-c',
      confFile,
      '-m',
      randomDir,
      '-p',
      container.getPort().toString(),
      '-h',
      container.getHost(),
      '-u',
      'neo4j', // Default username for Neo4j
      '-P',
      'password', // Default password for Neo4j
    ])
    commandResult = out

    // Verify migration applied successfully
    expect(out.stdout).to.contain('Database is up to date')

    // Assert no migrations have been applied
    const session = container.session!
    const result = await session.run(`MATCH (m:__Neo4jMigration) RETURN count(m) as migrationCount`)
    const migrationCount = result.records[0].get('migrationCount').toNumber()
    expect(migrationCount).to.equal(1)
  })

  it('runs any pending migrations', async () => {
    const confFile = `${configDir}/config.json`
    await runCommand(`init -c ${confFile}`)

    const randomDir = `${migrationsDir}/${chance.word({length: 5})}/`

    const file1 = `migration-${chance.word({length: 4})}`
    const file2 = `migration-${chance.word({length: 4})}`
    const file3 = `migration-${chance.word({length: 4})}`

    await runCommand(['create', file1, '-c', confFile, '-m', randomDir])
    await runCommand(['create', file2, '-c', confFile, '-m', randomDir])
    await runCommand(['create', file3, '-c', confFile, '-m', randomDir])

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
  })

  it('fails if the directory is missing previous applied migrations', async () => {
    const confFile = `${configDir}/config.json`
    await runCommand(`init -c ${confFile}`)

    const randomDir = `${migrationsDir}/${chance.word({length: 5})}/`

    const file1 = `migration-${chance.word({length: 4})}`

    await runCommand(['create', file1, '-c', confFile, '-m', randomDir])

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
    const randomDir2 = `${migrationsDir}/${chance.word({length: 5})}/`

    const out2 = await runCommand([
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
      randomDir2,
    ])
    commandResult = out2

    expect(out2.error?.message).to.contain('Missing migration')

    // Assert that no migrations have been applied
    const session = container.session!
    const result = await session.run(`MATCH (m:__Neo4jMigration) RETURN count(m) as migrationCount`)
    const migrationCount = result.records[0].get('migrationCount').toNumber()
    expect(migrationCount).to.equal(2) // Expecting 1 migration to be applied + 1 Baseline
  })

  describe('should fail to migrate if it cannot connect to the database', () => {
    it('Unauthorized', async () => {
      const confFile = `${configDir}/config.json`
      await runCommand(`init -c ${confFile}`)

      const randomDir = `${migrationsDir}/${chance.word({length: 5})}/`

      const file1 = `migration-${chance.word({length: 4})}`

      await runCommand(['create', file1, '-c', confFile, '-m', randomDir])

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
        chance.word({length: 10}),
        '-m',
        randomDir,
      ])
      commandResult = out
      expect(out.error?.message).to.contain('The client is unauthorized')
    })

    it('Invalid host', async () => {
      const confFile = `${configDir}/config.json`
      await runCommand(`init -c ${confFile}`)

      const randomDir = `${migrationsDir}/${chance.word({length: 5})}/`

      const file1 = `migration-${chance.word({length: 4})}`

      await runCommand(['create', file1, '-c', confFile, '-m', randomDir])

      const out = await runCommand([
        'migrate',
        '-c',
        confFile,
        '-p',
        container.getPort().toString(),
        '-h',
        'invalid-host',
        '-u',
        'neo4j',
        '-P',
        'password',
        '-m',
        randomDir,
      ])
      commandResult = out
      expect(out.error?.message).to.contain('Could not perform discovery')
    })

    it('Invalid port', async () => {
      const confFile = `${configDir}/config.json`
      await runCommand(`init -c ${confFile}`)

      const randomDir = `${migrationsDir}/${chance.word({length: 5})}/`

      const file1 = `migration-${chance.word({length: 4})}`

      await runCommand(['create', file1, '-c', confFile, '-m', randomDir])

      const out = await runCommand([
        'migrate',
        '-c',
        confFile,
        '-p',
        '42069',
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
      expect(out.error?.message).to.contain('Could not perform discovery')
    })

    it('Unsupported protocol', async () => {
      const confFile = `${configDir}/config.json`
      await runCommand(`init -c ${confFile}`)

      const randomDir = `${migrationsDir}/${chance.word({length: 5})}/`

      const file1 = `migration-${chance.word({length: 4})}`

      await runCommand(['create', file1, '-c', confFile, '-m', randomDir])

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
        '-s',
        'bolt+ssc',
      ])

      commandResult = out
      expect(out.error?.message).to.contain('Failed to connect to server')
    })
  })

  it('should fail to migrate if a migration was modified after being applied (invalid checksum)', async () => {
    const confFile = `${configDir}/config.json`
    await runCommand(`init -c ${confFile}`)

    const randomDir = `${migrationsDir}/${chance.word({length: 5})}/`

    const file1 = `migration-${chance.word({length: 4})}`

    const {stdout} = await runCommand(['create', file1, '-c', confFile, '-m', randomDir])

    const createdFile = stdout.split('Migration file created: ')[1].trim()

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

    fs.writeFileSync(createdFile, chance.word({length: 10}))

    const out2 = await runCommand([
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

    expect(out2.error?.message).to.contain('Checksum mismatch for')

    // Assert that migrations have been applied
    const session = container.session!
    const result = await session.run(`MATCH (m:__Neo4jMigration) RETURN count(m) as migrationCount`)
    const migrationCount = result.records[0].get('migrationCount').toNumber()
    expect(migrationCount).to.equal(2) // Expecting 1 migration to be applied + baseline
  })

  it('should not execute any migrations when --dry-run is passed', async () => {
    const confFile = `${configDir}/config.json`
    await runCommand(`init -c ${confFile}`)

    const randomDir = `${migrationsDir}/${chance.word({length: 5})}/`

    const file1 = `migration-${chance.word({length: 4})}`

    await runCommand(['create', file1, '-c', confFile, '-m', randomDir])

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
      '--dry-run',
    ])

    commandResult = out

    expect(out.stdout).to.contain('Dry run - no changes will be made to the database')

    // Use the container's session to check if any migrations have been applied
    const session = container.session! // Assuming this method exists to retrieve a session
    const result = await session.run(`MATCH (m:__Neo4jMigration) RETURN count(m) as migrationCount`)
    const migrationCount = result.records[0].get('migrationCount').toNumber()

    // Assert that no migrations have been applied
    expect(migrationCount).to.equal(1) // Expecting baseline to be applied
  })

  describe('transaction mode', () => {
    let commitSpy: sinon.SinonSpy

    beforeEach(() => {
      commitSpy = sinon.stub(neo4j.Transaction.prototype, 'commit').callThrough()
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should run a transaction per statement', async () => {
      const randomDir = `${migrationsDir}/${chance.word({length: 5})}/`

      // Run migrate command
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
        '--transaction-mode',
        'PER_MIGRATION',
      ])

      const file1 = `migration-${chance.word({length: 4})}`
      const createdFileOutput = await runCommand(['create', file1, '-m', randomDir])
      const createdFile = createdFileOutput.stdout.split('Migration file created: ')[1].trim()

      // Add multiple statements to the migration file
      fs.appendFileSync(
        createdFile,
        `
CREATE (x:Node {name: "test"});
CREATE (w:Node {name: "test"});
CREATE (y:Node {name: "test2"});`,
      )

      // reset counter to 0
      commitSpy.resetHistory()

      // Run migrate command
      const out = await runCommand([
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
        '--transaction-mode',
        'PER_STATEMENT',
      ])

      commandResult = out

      // Assert number of transactions
      expect(commitSpy.callCount).to.equal(5, 'Should commit one transaction per statement') // 1 per stament + 1 per migration node
    })

    it('should run a transaction per migration', async () => {
      const randomDir = `${migrationsDir}/${chance.word({length: 5})}/`

      // Run migrate command
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
        '--transaction-mode',
        'PER_MIGRATION',
      ])

      const file1 = `migration-${chance.word({length: 4})}`
      const createdFileOutput = await runCommand(['create', file1, '-m', randomDir])
      const createdFile = createdFileOutput.stdout.split('Migration file created: ')[1].trim()

      // Add multiple statements to the migration file
      fs.appendFileSync(
        createdFile,
        `
CREATE (x:Node {name: "test"});
CREATE (w:Node {name: "test"});
CREATE (y:Node {name: "test2"});`,
      )

      // reset counter to 0
      commitSpy.resetHistory()

      // Run migrate command
      const out = await runCommand([
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
        '--transaction-mode',
        'PER_MIGRATION',
      ])

      commandResult = out

      expect(commitSpy.callCount).to.equal(2, 'Should commit one transaction per statement') // 1 per migration + 1 per migration node
    })
  })
})
