import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import * as fs from 'fs-extra'
import {
  setupTestEnvironment,
  getRandomMigrationDir,
  createTestMigrations,
  getMigrationPathFromOutput,
} from '../utils/test-helpers'
import {
  setupTestContainer,
  cleanupTestResources,
  getContainerConnectionArgs,
  runMigrationsOnContainer,
  MigrationTestContext,
} from '../utils/neo4j-test-setup'

describe('validate command', () => {
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

  /**
   * Helper to run validate command with standard options
   */
  async function runValidateCommand(additionalArgs: string[] = []): Promise<Awaited<ReturnType<typeof runCommand>>> {
    const args = ['validate', '-s', 'bolt', ...getContainerConnectionArgs(testContext.container), ...additionalArgs]
    const result = await runCommand(args)
    commandResult = result
    return result
  }

  it('should pass validation when no migrations exist', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)

    const out = await runValidateCommand(['-m', randomDir])

    expect(out.stdout).to.contain('No migrations found in database or local directory')
  })

  it('should pass validation when all migrations are properly applied', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)

    await createTestMigrations(randomDir, 2)
    await runMigrationsOnContainer(testContext.container, randomDir, testContext.configFile, ['-s', 'bolt'])

    const out = await runValidateCommand(['-m', randomDir])

    expect(out.stdout).to.contain('All migrations are valid')
    expect(out.stderr).to.be.empty
  })

  it('should fail validation when a migration file is missing locally', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)

    await createTestMigrations(randomDir, 2)

    commandResult = await runMigrationsOnContainer(testContext.container, randomDir, testContext.configFile, [
      '-s',
      'bolt',
    ])

    fs.unlinkSync(randomDir + '/' + 'V1_0_0__test-migration-1.cypher')

    const out = await runValidateCommand(['-m', randomDir])

    expect(out.stderr).to.contain('Migration validation failed')
    expect(out.stdout).to.contain('MISSING_FILE')
    expect(out.stdout).to.contain('is missing locally')
  })

  it('should fail validation when a migration file exists locally but not in the database', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)

    await createTestMigrations(randomDir, 2)
    commandResult = await runMigrationsOnContainer(testContext.container, randomDir, testContext.configFile, [
      '-s',
      'bolt',
    ])

    await runCommand(['create', 'test-migration-3', '-m', randomDir])

    const out = await runValidateCommand(['-m', randomDir])

    expect(out.stderr).to.contain('Migration validation failed')
    expect(out.stdout).to.contain('MISSING_DB')
    expect(out.stdout).to.contain('exists locally but has not been applied to the database')
  })

  it('should fail validation when a migration file has been modified after being applied', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)

    const createResult = await runCommand(['create', 'test-migration-1', '-m', randomDir])
    const migrationFile = getMigrationPathFromOutput(createResult.stdout)

    await runMigrationsOnContainer(testContext.container, randomDir, testContext.configFile, ['-s', 'bolt'])

    fs.appendFileSync(migrationFile, '\nCREATE (n:Modified) RETURN n;')

    const out = await runValidateCommand(['-m', randomDir])

    expect(out.stderr).to.contain('Migration validation failed')
    expect(out.stdout).to.contain('CHECKSUM_MISMATCH')
    expect(out.stdout).to.contain('file was modified after it was applied to the database')
  })

  it('should exit immediately with fail-fast option when a validation error is found', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)

    const result1 = await runCommand(['create', 'test-migration-1', '-m', randomDir])
    const result2 = await runCommand(['create', 'test-migration-2', '-m', randomDir])

    const migrationFile1 = getMigrationPathFromOutput(result1.stdout)
    const migrationFile2 = getMigrationPathFromOutput(result2.stdout)

    await runMigrationsOnContainer(testContext.container, randomDir, testContext.configFile, ['-s', 'bolt'])

    fs.appendFileSync(migrationFile1, '\nCREATE (n:Modified) RETURN n;')
    fs.unlinkSync(migrationFile2)

    const out = await runValidateCommand(['-m', randomDir, '--fail-fast'])

    expect(out.stderr).to.contain('Migration validation failed')

    const errorMatches = out.stdout.match(/failures found/g) || []
    expect(errorMatches.length).to.be.lessThan(3, 'Should find fewer error types with fail-fast option')
  })

  it('should output a JSON report when output-file option is used', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)
    const outputFile = `${randomDir}/validation-report.json`

    fs.mkdirSync(randomDir, {recursive: true})

    const createResult = await runCommand(['create', 'test-migration-1', '-m', randomDir])
    const migrationFile = getMigrationPathFromOutput(createResult.stdout)

    await runMigrationsOnContainer(testContext.container, randomDir, testContext.configFile, ['-s', 'bolt'])

    fs.appendFileSync(migrationFile, '\nCREATE (n:Modified) RETURN n;')
    const out = await runValidateCommand(['-m', randomDir, '--output-file', outputFile])

    expect(out.stdout).to.contain('Detailed validation report written to:')
    expect(fs.existsSync(outputFile)).to.be.true

    const report = JSON.parse(fs.readFileSync(outputFile, 'utf8'))
    expect(report).to.have.property('summary')
    expect(report.summary).to.have.property('isValid', false)
    expect(report.summary).to.have.property('totalFailures').that.is.greaterThan(0)
    expect(report).to.have.property('details')
    expect(report).to.have.property('metadata')
  })

  it('should show only summary with summary-only option', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)

    await createTestMigrations(randomDir, 1)
    await runMigrationsOnContainer(testContext.container, randomDir, testContext.configFile, ['-s', 'bolt'])

    await runCommand(['create', 'test-migration-2', '-m', randomDir])

    const out = await runValidateCommand(['-m', randomDir, '--summary-only'])

    expect(out.stderr).to.contain('Migration validation failed')
    expect(out.stdout).to.contain('Validation Failure Summary:')
    expect(out.stdout).to.not.contain('Detailed failure information:')
  })

  it('should handle database connection errors gracefully', async () => {
    const randomDir = getRandomMigrationDir(testContext.configDir)

    const out = await runCommand([
      'validate',
      '-s',
      'bolt',
      '-p',
      '9999', // Wrong port
      '-h',
      testContext.container.getHost(),
      '-u',
      'neo4j',
      '-P',
      'password',
      '-m',
      randomDir,
    ])
    commandResult = out

    expect(out.error?.message).to.contain('Failed to connect')
  })
})
