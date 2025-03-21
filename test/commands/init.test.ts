import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import * as fs from 'fs-extra'
import * as path from 'node:path'
import {MORPHEUS_FILE_NAME} from '../../src/constants'
import {getTempDir, cleanDirectory, setupTestEnvironment} from '../utils/test-helpers'

describe('init command', () => {
  let configDir: string
  let commandResult: Awaited<ReturnType<typeof runCommand>>

  before(() => {
    configDir = getTempDir()
    cleanDirectory(configDir)
  })

  beforeEach(() => {
    setupTestEnvironment()
  })

  afterEach(function () {
    if (this.currentTest?.state === 'failed' && commandResult) {
      console.log('Failed test output:', commandResult)
    }
  })

  after(() => {
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, {recursive: true, force: true})
    }
  })

  it('creates a new configuration file successfully', async () => {
    const configPath = path.join(configDir, 'morpheus-test.json')

    commandResult = await runCommand(['init', '-c', configPath])

    expect(commandResult.stdout).to.contain('Configuration file created successfully')

    expect(fs.existsSync(configPath)).to.be.true

    const config = fs.readJsonSync(configPath)
    expect(config).to.have.property('host', 'localhost')
    expect(config).to.have.property('port', 7687)
    expect(config).to.have.property('username', 'neo4j')
  })

  it('fails when attempting to overwrite without force flag', async () => {
    const configPath = path.join(configDir, 'exists.json')

    fs.writeJsonSync(configPath, {test: 'data'})

    commandResult = await runCommand(['init', '-c', configPath])

    expect(commandResult.stderr).to.contain('already exists')

    const content = fs.readJsonSync(configPath)
    expect(content).to.deep.equal({test: 'data'})
  })

  it('overwrites existing file when using force flag', async () => {
    const configPath = path.join(configDir, 'force-overwrite.json')

    fs.writeJsonSync(configPath, {test: 'original'})

    commandResult = await runCommand(['init', '-c', configPath, '--force'])

    expect(commandResult.stdout).to.contain('Configuration file created successfully')

    const content = fs.readJsonSync(configPath)
    expect(content).to.have.property('username', 'neo4j')
    expect(content).to.not.have.property('test')
  })

  it('creates default file in current directory when no path specified', async () => {
    const defaultPath = path.join(process.cwd(), MORPHEUS_FILE_NAME)
    let backupData

    if (fs.existsSync(defaultPath)) {
      backupData = fs.readJsonSync(defaultPath)
      fs.removeSync(defaultPath)
    }

    try {
      commandResult = await runCommand(['init'])

      expect(commandResult.stdout).to.contain('Configuration file created successfully')

      expect(fs.existsSync(defaultPath)).to.be.true
    } finally {
      if (backupData) {
        fs.writeJsonSync(defaultPath, backupData)
      } else if (fs.existsSync(defaultPath)) {
        fs.removeSync(defaultPath)
      }
    }
  })
})
