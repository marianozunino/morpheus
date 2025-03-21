import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import * as fs from 'fs-extra'
import * as path from 'node:path'
import {
  getTempDir,
  cleanDirectory,
  setupTestEnvironment,
  initTestConfig,
  getMigrationPathFromOutput,
} from '../utils/test-helpers'

describe('create command', () => {
  let configDir: string
  let configFile: string
  let commandResult: Awaited<ReturnType<typeof runCommand>>
  const originalEnv = {...process.env}

  before(() => {
    configDir = getTempDir()
    configFile = path.join(configDir, 'config.json')

    cleanDirectory(configDir)
  })

  beforeEach(async () => {
    setupTestEnvironment()
    await initTestConfig(configFile)
  })

  afterEach(function () {
    process.env = {...originalEnv}

    if (this.currentTest?.state === 'failed' && commandResult) {
      console.log('Failed test output:', commandResult)
    }
  })

  after(() => {
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, {recursive: true, force: true})
    }
  })

  it('creates a new migration file with valid content', async () => {
    const migrationName = 'test-migration-file'

    commandResult = await runCommand(['create', migrationName, '-c', configFile])

    expect(commandResult.stdout).to.contain('Migration file created:')

    const createdFile = getMigrationPathFromOutput(commandResult.stdout)

    expect(fs.existsSync(createdFile)).to.be.true

    const content = fs.readFileSync(createdFile, 'utf-8')
    expect(content).to.contain('CREATE (agent:`007`) RETURN agent;')

    const filename = path.basename(createdFile)
    expect(filename).to.match(/^V\d+_\d+_\d+__test-migration-file\.cypher$/)
  })

  it('creates migration in custom directory using -m flag', async () => {
    const customDir = path.join(configDir, 'custom-migrations')
    const migrationName = 'custom-dir-migration'

    commandResult = await runCommand(['create', migrationName, '-c', configFile, '-m', customDir])

    expect(commandResult.stdout).to.contain('Migration file created:')
    expect(commandResult.stdout).to.contain(customDir)

    const createdFile = getMigrationPathFromOutput(commandResult.stdout)

    expect(fs.existsSync(createdFile)).to.be.true

    expect(path.dirname(createdFile)).to.equal(customDir)
  })

  it('supports environment variable for migrations path', async () => {
    const envMigrationsDir = path.join(configDir, 'env-migrations')
    const migrationName = 'env-var-migration'

    process.env.MORPHEUS_MIGRATIONS_PATH = envMigrationsDir

    commandResult = await runCommand(['create', migrationName, '-c', configFile])

    expect(commandResult.stdout).to.contain('Migration file created:')
    expect(commandResult.stdout).to.contain(envMigrationsDir)

    const createdFile = getMigrationPathFromOutput(commandResult.stdout)

    expect(fs.existsSync(createdFile)).to.be.true

    expect(path.dirname(createdFile)).to.equal(envMigrationsDir)
  })

  it('creates migrations with incrementing version numbers', async () => {
    const testMigrationsDir = path.join(configDir, 'sequence-test-migrations')
    fs.ensureDirSync(testMigrationsDir)

    const migrationNames = ['first-migration', 'second-migration', 'third-migration']
    const createdFiles: string[] = []

    for (const name of migrationNames) {
      commandResult = await runCommand(['create', name, '-c', configFile, '-m', testMigrationsDir])
      createdFiles.push(getMigrationPathFromOutput(commandResult.stdout))
    }

    const versions = createdFiles.map((file) => {
      const match = path.basename(file).match(/^V(\d+)_(\d+)_(\d+)__/)
      return match ? parseInt(match[1]) : null
    })

    expect(versions[0]).to.equal(1)
    expect(versions[1]).to.equal(2)
    expect(versions[2]).to.equal(3)
  })

  it('it fails with invalid characters in migration names', async () => {
    const invalidName = 'test/invalidnamewithchars'

    commandResult = await runCommand(['create', invalidName, '-c', configFile])
    expect(commandResult.error?.message).to.contain('Migration file name contains invalid characters')
  })

  it('fails with appropriate error for empty migration name', async () => {
    commandResult = await runCommand(['create', '', '-c', configFile])
    expect(commandResult.error?.message).to.contain('Missing 1 required arg')
  })
})
