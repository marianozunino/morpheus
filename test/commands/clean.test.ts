import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {Neo4jTestContainer} from '../test-container'
import * as fs from 'fs-extra'
import * as path from 'node:path'
import {tmpdir} from 'os'

describe('clean', () => {
  let container: Neo4jTestContainer
  let configDir = path.join(tmpdir(), 'morpheus')

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

  it('cleans up Neo4j migrations related data', async () => {
    const confFile = `${configDir}/config.json`
    await runCommand(`init -c ${confFile}`)

    // Run clean command
    const {stdout} = await runCommand([
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

    // Verify output
    expect(stdout).to.contain('Dropped chain')
    expect(stdout).to.not.contain('Dropped constraints')
  })

  it('drops constraints when the --drop-constraints flag is used', async () => {
    const confFile = `${configDir}/config.json`
    await runCommand(`init -c ${confFile}`)

    // Run clean command
    const {stdout} = await runCommand([
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

    // Verify output
    expect(stdout).to.contain('Dropped chain')
    expect(stdout).to.contain('Dropped constraints')
  })
})
