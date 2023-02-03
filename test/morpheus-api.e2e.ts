import { Test, TestingModule } from '@nestjs/testing';
import { cleanUp, closeNeo4j, openNeo4j } from './utils';
import { MorpheusModule } from '../src/morpheus/morpheus.module';
import { LoggerService } from '../src/logger.service';
import { INestApplication } from '@nestjs/common';
import * as testUtils from './utils';
import { DEFAULT_MIGRATIONS_PATH } from '../src/app.constants';

jest.mock('../src/logger.service');

describe('Morpheus API (e2e)', () => {
  let app: INestApplication;
  let loggerService: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    await cleanUp();
    jest.clearAllMocks();
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      imports: [MorpheusModule],
    }).compile();
    loggerService = module.get(LoggerService);
    app = module.createNestApplication();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    await cleanUp();
  });

  afterAll(closeNeo4j);
  beforeAll(openNeo4j);

  describe('Module', () => {
    it('fails to start if there is no .morpheus.json file', async () => {
      expect.assertions(2);
      try {
        await app.init();
      } catch (e) {
        expect(e).toBeDefined();
        expect(e.message).toEqual(
          "Couldn't find a valid .morpheus.json file.\nIssue the following command to create one:\n> morpheus init",
        );
      }
    });

    it('starts if there is a .morpheus.json file, creates the migrations folder and runs the migrations', async () => {
      await testUtils.createNeo4jConfigFile();
      expect.assertions(4);
      try {
        await app.init();
        expect(loggerService.error).not.toHaveBeenCalled();
        expect(loggerService.log).toHaveBeenCalledWith('Migration complete');
        expect(loggerService.log).toHaveBeenCalledWith(
          `Migrations folder created: ${DEFAULT_MIGRATIONS_PATH}`,
        );
        expect(loggerService.log).toHaveBeenCalledWith(
          'Database is up to date',
        );
      } catch (e) {
        console.log(e);
      }
    });

    it('fails to start if there is a .morpheus.json but cannot connect to the database', async () => {
      await testUtils.createNeo4jConfigFile({
        host: 'localhost',
      });
      expect.assertions(2);
      try {
        await app.init();
      } catch (e) {
        expect(e).toBeDefined();
        expect(e.message).toEqual(
          expect.stringContaining(
            'Could not perform discovery. No routing servers available.',
          ),
        );
      }
    });

    it('executes the migrations if the database is not up to date', async () => {
      await testUtils.createNeo4jConfigFile();
      await testUtils.createMigrationFile();
      expect.assertions(4);
      try {
        await app.init();
        expect(loggerService.error).not.toHaveBeenCalled();
        expect(loggerService.log).toHaveBeenCalledWith('Executing migrations');
        expect(loggerService.log).toHaveBeenCalledWith(
          'Executing migration: V0_0_0__1.cypher',
        );
        expect(loggerService.log).toHaveBeenCalledWith('Migration complete');
      } catch (e) {
        console.log(e);
      }
    });
  });
});
