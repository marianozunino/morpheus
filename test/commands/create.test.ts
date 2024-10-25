import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import * as fs from 'fs-extra'
import * as path from 'node:path'
import {tmpdir} from 'os'

const chance = require('chance').Chance()

describe('create', () => {
  let configDir = path.join(tmpdir(), 'morpheus')
  let migrationsDir = path.join(configDir, 'migrations')

  before(async () => {
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, {recursive: true, force: true})
    }
  })

  after(async () => {
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, {recursive: true, force: true})
    }
  })

  it('creates a new migration file successfully', async () => {
    const confFile = `${configDir}/config.json`
    await runCommand(`init -c ${confFile}`)

    const {stdout} = await runCommand(['create', 'create_test_migration', '-c', confFile])

    // Verify command output
    expect(stdout).to.contain('Migration file created')

    // Check if the migration file was created
    const createdFile = stdout.split('✔ Migration file created: ')[1].trim()
    expect(fs.existsSync(createdFile)).to.be.true

    // Ensure migration file content is valid
    const fileContent = fs.readFileSync(createdFile, 'utf-8')
    expect(fileContent).to.contain('CREATE (agent:`007`) RETURN agent;')
  })

  it('creates migration file with custom config file', async () => {
    const confFile = `${configDir}/config.json`
    await runCommand(`init -c ${confFile}`)

    const {stdout} = await runCommand(['create', 'custom_test_migration', '-c', confFile])

    const createdFile = stdout.split('✔ Migration file created: ')[1].trim()
    expect(fs.existsSync(createdFile)).to.be.true

    // Verify command output
    expect(stdout).to.contain('Migration file created')
  })

  it('changes migrations directory using the -m flag', async () => {
    const confFile = `${configDir}/config.json`
    await runCommand(`init -c ${confFile}`)

    const {stdout} = await runCommand(['create', 'custom_test_migration', '-c', confFile, '-m', migrationsDir])

    const createdFile = stdout.split('✔ Migration file created: ')[1].trim()
    expect(fs.existsSync(createdFile)).to.be.true
    expect(stdout).to.contain(migrationsDir)
  })

  it('changes migrations directory using the env var MORPHEUS_MIGRATIONS_PATH', async () => {
    const confFile = `${configDir}/config.json`
    await runCommand(`init -c ${confFile}`)

    const randomDir = `${migrationsDir}/${chance.word({length: 10})}`

    process.env.MORPHEUS_MIGRATIONS_PATH = randomDir
    const {stdout} = await runCommand(['create', 'custom_test_migration', '-c', confFile])
    process.env.MORPHEUS_MIGRATIONS_PATH = undefined

    const createdFile = stdout.split('✔ Migration file created: ')[1].trim()
    expect(fs.existsSync(createdFile)).to.be.true
    expect(stdout).to.contain(randomDir)
  })
})
