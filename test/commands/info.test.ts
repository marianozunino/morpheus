import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {Neo4jTestContainer} from '../test-container'
import * as fs from 'fs-extra'
import * as path from 'node:path'
import {MORPHEUS_FILE_NAME} from '../../src/constants'
import {tmpdir} from 'os'

const chance = require('chance').Chance()

describe('info', () => {
  let container: Neo4jTestContainer
  const configDir = path.join(tmpdir(), 'morpheus')
  const migrationsDir = path.join(configDir, 'migrations')

  before(async () => {
    // Set up the Neo4j test container
    container = new Neo4jTestContainer()
    await container.start()

    // Clean up config and migrations directories if they exist
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, {force: true, recursive: true})
    }
  })

  after(async () => {
    // Stop the Neo4j container and clean up files
    await container.stop()
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, {force: true, recursive: true})
    }
  })

  beforeEach(async () => {
    await container.wipe()
  })

  it('should fail to run info if morpheus.json does not exist', async () => {
    // Run migrate command
    const out = await runCommand(['info', '-c', path.join(tmpdir(), chance.word({length: 10}))])

    // Verify migration applied successfully
    expect(out.error?.message).to.contain('Configuration validation failed')
  })

  describe('should fail to info if it cannot connect to the database', async () => {
    it('Unauthorized', async () => {
      const randomDir = `${migrationsDir}/${chance.word({length: 10})}`

      // Run migrate command
      const out = await runCommand([
        'info',
        '-s',
        'bolt',
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

      // Verify migration applied successfully
      expect(out.error?.message).to.contain('The client is unauthorized due to authentication failure.')
    })

    it('Invalid host', async () => {
      const randomDir = `${migrationsDir}/${chance.word({length: 10})}`

      // Run migrate command
      const out = await runCommand([
        'info',
        '-s',
        'bolt',
        '-p',
        container.getPort().toString(),
        '-h',
        'example.com',
        '-u',
        'neo4j',
        '-P',
        'password',
        '-m',
        randomDir,
      ])

      // Verify migration applied successfully
      expect(out.error?.message).to.contain('Failed to connect to server.')
    })

    it('Invalid port', async () => {
      const randomDir = `${migrationsDir}/${chance.word({length: 10})}`

      // Run migrate command
      const out = await runCommand([
        'info',
        '-s',
        'bolt',
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

      // Verify migration applied successfully
      expect(out.error?.message).to.contain('Failed to connect to server.')
    })
  })

  it('should info that there are no migrations', async () => {
    const randomDir = `${migrationsDir}/${chance.word({length: 10})}`
    const out = await runCommand([
      'info',
      '-s',
      'bolt',
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
    expect(out.stdout).to.contain('Database is up to date, but there are no migrations in the migrations folder')
  })

  it('should info about the applied migrations', async () => {
    const randomDir = `${migrationsDir}/${chance.word({length: 10})}`

    const file1 = `migration-${chance.word({length: 4})}`
    const file2 = `migration-${chance.word({length: 4})}`

    await runCommand(['create', file1, '-m', randomDir])
    await runCommand(['create', file2, '-m', randomDir])

    await runCommand([
      'migrate',
      '-s',
      'bolt',
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
      'info',
      '-s',
      'bolt',
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

    expect(out.stdout).to.contain(file2)
    expect(out.stdout).to.contain(file1)
    expect(out.stdout).not.to.contain('PENDING')
  })

  it('should info about the applied migrations and the pending migrations', async () => {
    const randomDir = `${migrationsDir}/${chance.word({length: 10})}`

    const file1 = `migration-${chance.word({length: 4})}`
    const file2 = `migration-${chance.word({length: 4})}`

    await runCommand(['create', file1, '-m', randomDir])
    await runCommand(['create', file2, '-m', randomDir])

    await runCommand([
      'migrate',
      '-s',
      'bolt',
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

    const file3 = `migration-${chance.word({length: 4})}`
    await runCommand(['create', file3, '-m', randomDir])

    const out = await runCommand([
      'info',
      '-s',
      'bolt',
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

    expect(out.stdout).to.contain(file3)
    expect(out.stdout).to.contain(file2)
    expect(out.stdout).to.contain(file1)
    expect(out.stdout).to.contain('PENDING')
  })

  it('should info about applied but missing local migrations', async () => {
    const randomDir = `${migrationsDir}/${chance.word({length: 10})}`

    const file1 = `migration-${chance.word({length: 4})}`
    const file2 = `migration-${chance.word({length: 4})}`

    await runCommand(['create', file1, '-m', randomDir])
    await runCommand(['create', file2, '-m', randomDir])

    await runCommand([
      'migrate',
      '-s',
      'bolt',
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

    fs.rmSync(randomDir, {recursive: true})

    const out = await runCommand([
      'info',
      '-s',
      'bolt',
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

    expect(out.stdout).to.contain(file2)
    expect(out.stdout).to.contain(file1)
    expect(out.stdout).to.contain('There are more migrations in the database than in the migrations folder')
  })
})
