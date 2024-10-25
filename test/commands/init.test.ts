import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {Neo4jTestContainer} from '../test-container'
import * as fs from 'fs-extra'
import * as path from 'node:path'
import {MORPHEUS_FILE_NAME} from '../../src/constants'
import {tmpdir} from 'os'

describe('init', () => {
  let configDir = path.join(tmpdir(), 'morpheus')

  before(async () => {
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, {recursive: true, force: true})
    }
  })

  it('runs init command successfully', async () => {
    const {stdout} = await runCommand(`init -c ${configDir}/config.json`)
    expect(stdout).to.contain('Configuration file created ')
  })

  it('overwrites morpheus file when force flag is used', async () => {
    const filePath = path.join(configDir, MORPHEUS_FILE_NAME)
    fs.ensureDirSync(path.dirname(filePath))
    fs.writeFileSync(filePath, 'existing content')

    const {stdout} = await runCommand(['init', '--force', '-c', filePath])

    expect(stdout).to.contain(`Configuration file created successfully: ${filePath}`)
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    expect(fileContent).to.not.equal('existing content')
  })

  it('fails to create morpheus file if it exists and force is not used', async () => {
    const filePath = path.join(configDir, MORPHEUS_FILE_NAME)
    fs.ensureDirSync(path.dirname(filePath))
    fs.writeFileSync(filePath, 'existing content')

    const {stdout} = await runCommand(['init', '-c', filePath])

    expect(stdout).to.contain('already exists')
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    expect(fileContent).to.equal('existing content')
  })
})
