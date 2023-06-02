import { Test, TestingModule } from '@nestjs/testing';
import { cleanUp, closeNeo4j, openNeo4j } from './utils';
import { MorpheusModule } from '../src/morpheus';
import { LoggerService } from '../src/logger.service';
import { INestApplication } from '@nestjs/common';
import * as testUtils from './utils';
import {
  DEFAULT_MIGRATIONS_PATH,
  GLOBAL_CONFIG_TOKEN,
  MORPHEUS_FILE_NAME,
} from '../src/app.constants';
import { writeFile } from 'fs-extra';
import { LazyModuleLoader } from '@nestjs/core';

jest.mock('../src/logger.service');

describe('Morpheus API (e2e)', () => {
  let app: INestApplication;
  let loggerService: jest.Mocked<LoggerService>;
  let lazyModuleLoader: jest.Mocked<LazyModuleLoader>;

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
    it('shows a message if no .morpheus.json file is found', async () => {
      await app.init();
      expect(loggerService.error).not.toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith(
        'No config provided, make sure to provide one either in the module options, environment variables or in the config file',
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        'You can still run migrations manually by calling the runMigrationsFor method',
      );
    });

    it('fails if the .morpheus.json file is invalid', async () => {
      await writeFile(
        MORPHEUS_FILE_NAME,
        JSON.stringify('invalid json file', null, 2),
      );
      await app.init();

      expect(loggerService.log).toHaveBeenCalledWith(
        'No config provided, make sure to provide one either in the module options, environment variables or in the config file',
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        'You can still run migrations manually by calling the runMigrationsFor method',
      );
    });

    it('starts if there is a .morpheus.json file, creates the migrations folder and runs the migrations', async () => {
      await testUtils.createNeo4jConfigFile();
      await app.init();
      expect(loggerService.error).not.toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith(
        `Migrations folder created: ${DEFAULT_MIGRATIONS_PATH}`,
      );
      expect(loggerService.log).toHaveBeenCalledWith('Database is up to date');
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
      expect.assertions(3);
      try {
        await app.init();
        expect(loggerService.error).not.toHaveBeenCalled();
        expect(loggerService.debug).toHaveBeenCalledWith(
          'Executing migrations',
        );
        expect(loggerService.log).toHaveBeenCalledWith(
          'Executing migration: V0_0_0__1.cypher',
        );
      } catch (e) {
        console.log(e);
      }
    });
  });
});
