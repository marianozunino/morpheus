import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {Neo4jTestContainer} from '../test-container'
import * as fs from 'fs-extra'
import * as path from 'node:path'
import {tmpdir} from 'os'

const chance = require('chance').Chance()

describe('migrate', () => {
  let container: Neo4jTestContainer
  let configDir = path.join(tmpdir(), 'morpheus')
  let migrationsDir = path.join(configDir, 'migrations')

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

    // Verify migration applied successfully
    expect(out.stdout).to.contain('Database is up to date')
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
    expect(out.stdout).to.contain(file1)
    expect(out.stdout).to.contain(file2)
    expect(out.stdout).to.contain(file3)
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

    expect(out2.error?.message).to.contain('Missing migration')
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
      expect(out.error?.message).to.contain('Failed to connect to server')
    })
  })

  it('should fail to migrate if a migration was modified after being applied (invalid checksum)', async () => {
    const confFile = `${configDir}/config.json`
    await runCommand(`init -c ${confFile}`)

    const randomDir = `${migrationsDir}/${chance.word({length: 5})}/`

    const file1 = `migration-${chance.word({length: 4})}`

    const {stdout} = await runCommand(['create', file1, '-c', confFile, '-m', randomDir])

    const createdFile = stdout.split('✔ Migration file created: ')[1].trim()

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

    expect(out2.error?.message).to.contain('Checksum mismatch for')
  })
})
