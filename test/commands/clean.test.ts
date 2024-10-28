import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {Neo4jTestContainer} from '../test-container'
import * as fs from 'fs-extra'
import * as path from 'node:path'
import {tmpdir} from 'os'
import {Logger} from '../../src/services/logger'

const MIGRATION_LABEL = '__Neo4jMigration' // Assuming this is defined in the same file or imported

describe('clean', () => {
  let container: Neo4jTestContainer
  let configDir = path.join(tmpdir(), 'morpheus')
  let commandResult: Awaited<ReturnType<typeof runCommand>>

  before(async () => {
    container = new Neo4jTestContainer()
    await container.start()
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, {recursive: true, force: true})
    }
  })

  after(async () => {
    await container.stop()
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, {recursive: true, force: true})
    }
  })

  afterEach(function () {
    if (this.currentTest?.state === 'failed' && commandResult) {
      console.log(commandResult)
    }
    Logger.initialize() // Reset logger
  })

  it('cleans up Neo4j migrations related data', async () => {
    const confFile = `${configDir}/config.json`
    await runCommand(`init -c ${confFile}`)

    // Run clean command
    const result = await runCommand([
      'clean',
      '-c',
      confFile,
      '-p',
      container.getPort().toString(),
      '-h',
      container.getHost(),
      '-P',
      'password',
    ])

    commandResult = result
    const stdout = result.stdout

    expect(stdout).to.contain('Successfully dropped migration chain')
    expect(stdout).to.not.contain('Successfully dropped Moprheus constraints and indices')
  })

  it('drops constraints when the --drop-constraints flag is used', async () => {
    const confFile = `${configDir}/config.json`
    await runCommand(`init -c ${confFile}`)

    // Create dummy migrations and constraints
    await runCommand(['create', 'migration-1', '-c', confFile])

    // Run clean command with --drop-constraints flag
    const result = await runCommand([
      'clean',
      '-c',
      confFile,
      '-p',
      container.getPort().toString(),
      '-h',
      container.getHost(),
      '-P',
      'password',
      '--drop-constraints',
    ])

    commandResult = result
    const stdout = result.stdout

    expect(stdout).to.contain('Successfully dropped migration chain')
    expect(stdout).to.contain('Successfully dropped Moprheus constraints and indices')
  })

  it('shows debug messages when --debug flag is used', async () => {
    const confFile = `${configDir}/config.json`
    await runCommand(`init -c ${confFile}`)

    // Run clean command with --debug flag
    const result = await runCommand([
      'clean',
      '-c',
      confFile,
      '-p',
      container.getPort().toString(),
      '-h',
      container.getHost(),
      '-P',
      'password',
      '--debug',
    ])

    commandResult = result
    const stdout = result.stdout

    expect(stdout).to.contain('Successfully dropped migration chain')
    expect(stdout).to.contain('DEBUG Executing query:')
  })

  it('shows messages in json format when --json flag is used', async () => {
    const confFile = `${configDir}/config.json`
    await runCommand(`init -c ${confFile}`)

    // Run clean command with --json flag
    const result = await runCommand([
      'clean',
      '-c',
      confFile,
      '-p',
      container.getPort().toString(),
      '-h',
      container.getHost(),
      '-P',
      'password',
      '--json',
    ])

    commandResult = result
    const stdout = result.stdout

    expect(stdout).to.contain('{"level":"info","message":"Successfully dropped migration chain","timestamp"')
  })
})
