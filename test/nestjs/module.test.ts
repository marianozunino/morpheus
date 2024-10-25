import {Test, TestingModule} from '@nestjs/testing'
import {MorpheusModule, MorpheusService, Neo4jScheme} from '../../src/nestjs'
import {Neo4jTestContainer} from '../test-container'
import {expect} from 'chai'
import path from 'node:path'
import {tmpdir} from 'node:os'
import {existsSync, rmSync} from 'fs-extra'

describe('Morpheus API (e2e)', () => {
  let morpheusService: MorpheusService

  let container: Neo4jTestContainer
  const configDir = path.join(tmpdir(), 'morpheus')
  const migrationsDir = path.join(configDir, 'migrations')

  before(async () => {
    // Set up the Neo4j test container
    container = new Neo4jTestContainer()
    await container.start()

    // Clean up config and migrations directories if they exist
    if (existsSync(configDir)) {
      rmSync(configDir, {force: true, recursive: true})
    }
  })

  after(async () => {
    // Stop the Neo4j container and clean up files
    await container.stop()
    if (existsSync(configDir)) {
      rmSync(configDir, {force: true, recursive: true})
    }
  })

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [MorpheusModule],
    }).compile()

    morpheusService = module.get(MorpheusService)
  })

  describe('MorpheusService', () => {
    it('must be defined', () => {
      expect(morpheusService).to.not.be.undefined
    })

    describe('runMigrationsFor', () => {
      it('must have a runMigrations method', () => {
        expect(morpheusService.runMigrations).to.not.be.undefined
      })

      it('must execute the migrations', async () => {
        await morpheusService.runMigrations({
          migrationsPath: migrationsDir,
          host: container.getHost(),
          port: container.getPort(),
          password: 'password',
          username: 'neo4j',
          scheme: Neo4jScheme.BOLT,
        })
      })
    })

    describe('cleanDatabase', () => {
      it('must have a cleanDatabase method', () => {
        expect(morpheusService.cleanDatabase()).to.not.be.undefined
      })

      it('must execute the cleanDatabase', async () => {
        await morpheusService.cleanDatabase({
          host: container.getHost(),
          port: container.getPort(),
          password: 'password',
          username: 'neo4j',
          scheme: Neo4jScheme.BOLT,
        })
      })
    })
  })
})
