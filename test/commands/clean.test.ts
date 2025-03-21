import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {setupTestEnvironment, initTestConfig} from '../utils/test-helpers'
import {
  setupTestContainer,
  cleanupTestResources,
  getContainerConnectionArgs,
  MigrationTestContext,
} from '../utils/neo4j-test-setup'

describe('clean command', () => {
  let testContext: MigrationTestContext
  let commandResult: Awaited<ReturnType<typeof runCommand>>

  beforeEach(() => {
    setupTestEnvironment()
  })

  before(async () => {
    testContext = await setupTestContainer()
  })

  after(async () => {
    await cleanupTestResources(testContext)
  })

  afterEach(function () {
    if (this.currentTest?.state === 'failed' && commandResult) {
      console.log('Failed test output:', commandResult)
    }
  })

  beforeEach(async () => {
    await testContext.container.wipe()
  })

  it('cleans up Neo4j migrations related data', async () => {
    await initTestConfig(testContext.configFile)

    commandResult = await runCommand([
      'clean',
      '-c',
      testContext.configFile,
      '-s',
      'bolt',
      ...getContainerConnectionArgs(testContext.container),
    ])

    expect(commandResult.stdout).to.contain('Successfully dropped migration chain')
    expect(commandResult.stdout).to.not.contain('Successfully dropped Moprheus constraints and indices')
  })

  it('drops constraints when the --drop-constraints flag is used', async () => {
    await initTestConfig(testContext.configFile)

    await runCommand(['create', 'migration-1', '-c', testContext.configFile, '-m', testContext.migrationsDir])

    commandResult = await runCommand([
      'clean',
      '-c',
      testContext.configFile,
      '-s',
      'bolt',
      ...getContainerConnectionArgs(testContext.container),
      '--drop-constraints',
    ])

    expect(commandResult.stdout).to.contain('Successfully dropped migration chain')
    expect(commandResult.stdout).to.contain('Successfully dropped Moprheus constraints and indices')
  })

  it('shows debug messages when --debug flag is used', async () => {
    await initTestConfig(testContext.configFile)

    commandResult = await runCommand([
      'clean',
      '-c',
      testContext.configFile,
      '-s',
      'bolt',
      ...getContainerConnectionArgs(testContext.container),
      '--debug',
    ])

    expect(commandResult.stdout).to.contain('Successfully dropped migration chain')
    expect(commandResult.stdout).to.contain('DEBUG Executing query:')
  })

  it('shows messages in json format when --json flag is used', async () => {
    await initTestConfig(testContext.configFile)

    commandResult = await runCommand([
      'clean',
      '-c',
      testContext.configFile,
      '-s',
      'bolt',
      ...getContainerConnectionArgs(testContext.container),
      '--json',
    ])

    expect(commandResult.stdout).to.contain(
      '{"level":"info","message":"Successfully dropped migration chain","timestamp"',
    )
  })

  it('fails gracefully when database connection fails', async () => {
    await initTestConfig(testContext.configFile)

    commandResult = await runCommand([
      'clean',
      '-c',
      testContext.configFile,
      '-s',
      'bolt',
      '-p',
      testContext.container.getPort().toString(),
      '-h',
      testContext.container.getHost(),
      '-u',
      'neo4j',
      '-P',
      'wrong-password',
    ])

    expect(commandResult.error?.message).to.contain('unauthorized due to authentication failure')
  })
})
