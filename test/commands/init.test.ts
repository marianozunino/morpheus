import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import * as fs from 'fs-extra'
import * as path from 'node:path'
import {MORPHEUS_FILE_NAME} from '../../src/constants'
import {tmpdir} from 'os'
import {Logger} from '../../src/services/logger'

describe('init', () => {
  let configDir = path.join(tmpdir(), 'morpheus')
  let commandResult: Awaited<ReturnType<typeof runCommand>>

  beforeEach(() => {
    Logger.initialize() // Reset logger
  })

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

  it('created a morpheus file in the current directory if no -c flag is used', async () => {
    // delete possibly existing morpheus file
    fs.removeSync(path.join(process.cwd(), MORPHEUS_FILE_NAME))
    const result = await runCommand(['init'])
    commandResult = result
    const stdout = result.stdout
    expect(stdout).to.contain('Configuration file created ')
    expect(fs.existsSync(path.join(process.cwd(), MORPHEUS_FILE_NAME))).to.be.true
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
