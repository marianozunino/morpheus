import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import * as fs from 'fs-extra'
import * as path from 'node:path'
import {MORPHEUS_FILE_NAME} from '../../src/constants'
import {tmpdir} from 'os'

describe('init', () => {
  let configDir = path.join(tmpdir(), 'morpheus')
  let commandResult: Awaited<ReturnType<typeof runCommand>>

  before(async () => {
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, {recursive: true, force: true})
    }
  })

  afterEach(function () {
    if (this.currentTest?.state === 'failed' && commandResult) {
      console.log(commandResult)
    }
  })

  it('runs init command successfully', async () => {
    const result = await runCommand(`init -c ${configDir}/config.json`)
    commandResult = result
    const stdout = result.stdout
    expect(stdout).to.contain('Configuration file created ')
  })

  it('overwrites morpheus file when force flag is used', async () => {
    const filePath = path.join(configDir, MORPHEUS_FILE_NAME)
    fs.ensureDirSync(path.dirname(filePath))
    fs.writeFileSync(filePath, 'existing content')

    const result = await runCommand(['init', '--force', '-c', filePath])
    commandResult = result
    const stdout = result.stdout

    expect(stdout).to.contain(`Configuration file created successfully: ${filePath}`)
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    expect(fileContent).to.not.equal('existing content')
  })

  it('fails to create morpheus file if it exists and force is not used', async () => {
    const filePath = path.join(configDir, MORPHEUS_FILE_NAME)
    fs.ensureDirSync(path.dirname(filePath))
    fs.writeFileSync(filePath, 'existing content')

    const result = await runCommand(['init', '-c', filePath])

    commandResult = result
    const stderr = result.stderr

    expect(stderr).to.contain('already exists')
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    expect(fileContent).to.equal('existing content')
  })
})
