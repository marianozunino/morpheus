import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import { exists, readFile, rm, writeFile } from 'fs-extra';
import { AppModule } from '../src/app.module';
import {
  cleanUp,
  closeNeo4j,
  createNeo4jConfigFile,
  nestedPath,
  openNeo4j,
  simplePath,
} from './utils';
import {
  DEFAULT_MIGRATIONS_PATH,
  MORPHEUS_FILE_NAME,
} from '../src/app.constants';
import { LoggerService } from '../src/logger.service';
import { Chance } from 'chance';

jest.mock('../src/logger.service');

const chance = Chance();

describe('Morpheus CLI (e2e)', () => {
  let app: TestingModule;
  let loggerService: jest.Mocked<LoggerService>;
  let exitSpy: jest.SpyInstance;

  beforeEach(async () => {
    await cleanUp();
    jest.clearAllMocks();
    jest.resetAllMocks();
    exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
    app = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();
    loggerService = app.get(LoggerService);
  });

  afterEach(async () => {
    await app.close();
    await cleanUp();
  });

  afterAll(closeNeo4j);
  beforeAll(openNeo4j);

  describe('init command', () => {
    it('should create a .morpheus.json file', async () => {
      let fileExists = await exists(MORPHEUS_FILE_NAME);
      expect(fileExists).toBe(false);
      await CommandTestFactory.run(app, ['init']);
      fileExists = await exists(MORPHEUS_FILE_NAME);
      expect(fileExists).toBe(true);
      expect(loggerService.log).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith(
        `Morpheus file created: ${MORPHEUS_FILE_NAME}`,
      );
    });

    it('should report an error if the file already exists', async () => {
      await CommandTestFactory.run(app, ['init']);
      expect(loggerService.log).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith(
        `Morpheus file created: ${MORPHEUS_FILE_NAME}`,
      );

      await CommandTestFactory.run(app, ['init']);
      expect(loggerService.error).toHaveBeenCalled();
      expect(loggerService.error).toHaveBeenCalledWith(
        `Morpheus file already exists: ${MORPHEUS_FILE_NAME}`,
      );
    });

    it('should create a .morpheus.json if the file already exists and the force flag is set', async () => {
      await CommandTestFactory.run(app, ['init']);
      expect(loggerService.log).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith(
        `Morpheus file created: ${MORPHEUS_FILE_NAME}`,
      );

      await CommandTestFactory.run(app, ['init', '--force']);
      expect(loggerService.log).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith(
        `Morpheus file created: ${MORPHEUS_FILE_NAME}`,
      );
    });
  });

  describe('create command', () => {
    it('should fail to create migration file if .morpheus.json does not exist', async () => {
      await CommandTestFactory.run(app, ['create', 'test']);

      expect(loggerService.error).toHaveBeenCalled();
      expect(loggerService.error).toHaveBeenCalledWith(
        `Couldn't find a valid .morpheus.json file.
Issue the following command to create one:
> morpheus init`,
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should create a migration file', async () => {
      const fileName = chance.word();

      await CommandTestFactory.run(app, ['init']);
      await CommandTestFactory.run(app, ['create', fileName]);

      expect(loggerService.log).toHaveBeenCalledTimes(3);
      expect(loggerService.log).toHaveBeenCalledWith(
        `Morpheus file created: ${MORPHEUS_FILE_NAME}`,
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        `Migrations folder created: ${DEFAULT_MIGRATIONS_PATH}`,
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        `Migration file created: neo4j/migrations/V1_0_0__${fileName}.cypher`,
      );
    });

    it('should create a migration file with a greater version number', async () => {
      const fileName = chance.word();

      await CommandTestFactory.run(app, ['init']);
      await CommandTestFactory.run(app, ['create', fileName]);

      expect(loggerService.log).toHaveBeenCalledTimes(3);
      expect(loggerService.log).toHaveBeenCalledWith(
        `Morpheus file created: ${MORPHEUS_FILE_NAME}`,
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        `Migrations folder created: ${DEFAULT_MIGRATIONS_PATH}`,
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        `Migration file created: neo4j/migrations/V1_0_0__${fileName}.cypher`,
      );

      const fileName2 = chance.word();

      await CommandTestFactory.run(app, ['create', fileName2]);

      expect(loggerService.log).toHaveBeenCalledTimes(4);
      expect(loggerService.log).toHaveBeenCalledWith(
        `Migrations folder created: ${DEFAULT_MIGRATIONS_PATH}`,
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        `Migration file created: neo4j/migrations/V2_0_0__${fileName2}.cypher`,
      );
    });

    it('should create a migration file in the specified folder', async () => {
      const fileName = chance.word();
      await createNeo4jConfigFile({
        path: simplePath,
      });

      await CommandTestFactory.run(app, ['create', fileName]);

      expect(loggerService.log).toHaveBeenCalledTimes(2);
      expect(loggerService.log).toHaveBeenCalledWith(
        `Migrations folder created: ${simplePath}`,
      );
    });

    it('should create a migration file in the specified nested folder', async () => {
      const fileName = chance.word();

      await createNeo4jConfigFile({
        path: nestedPath,
      });

      await CommandTestFactory.run(app, ['create', fileName]);

      expect(loggerService.log).toHaveBeenCalledTimes(2);
      expect(loggerService.log).toHaveBeenCalledWith(
        `Migrations folder created: ${nestedPath}`,
      );
    });
  });

  describe('migrate command', () => {
    it('should fail to migrate if .morpheus.json does not exist', async () => {
      await CommandTestFactory.run(app, ['migrate']);

      expect(loggerService.error).toHaveBeenCalled();
      expect(loggerService.error).toHaveBeenCalledWith(
        `Couldn't find a valid .morpheus.json file.
Issue the following command to create one:
> morpheus init`,
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should fail to migrate if it cannot connect to the database', async () => {
      await createNeo4jConfigFile({
        migrationsPath: simplePath,
        host: 'localhost',
        path: simplePath,
      });

      await CommandTestFactory.run(app, ['migrate']);

      expect(loggerService.error).toHaveBeenCalled();
      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Could not perform discovery. No routing servers available. ',
        ),
      );
    });

    it('should migrate if it can connect to the database', async () => {
      await createNeo4jConfigFile({
        path: simplePath,
      });
      const word = chance.word();
      await CommandTestFactory.run(app, ['create', word]);

      await CommandTestFactory.run(app, ['migrate']);
      expect(loggerService.log).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith(
        `Migrations folder created: ${simplePath}`,
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        `Migration file created: ${simplePath}/V1_0_0__${word}.cypher`,
      );

      expect(loggerService.log).toHaveBeenCalledWith(
        `Executing migration: V1_0_0__${word}.cypher`,
      );
    });

    it('should create the directory if it does not exist', async () => {
      await createNeo4jConfigFile({
        path: simplePath,
      });
      await CommandTestFactory.run(app, ['migrate']);

      expect(loggerService.log).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith(
        `Migrations folder created: ${simplePath}`,
      );

      expect(loggerService.log).toHaveBeenCalledWith(`Database is up to date`);
    });

    it('should fail to migrate if a migration was modified after being applied', async () => {
      await createNeo4jConfigFile({
        path: simplePath,
      });
      const migration1 = chance.word();
      await CommandTestFactory.run(app, ['create', migration1]);

      await CommandTestFactory.run(app, ['migrate']);
      expect(loggerService.log).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith(
        `Migrations folder created: ${simplePath}`,
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        `Migration file created: ${simplePath}/V1_0_0__${migration1}.cypher`,
      );

      expect(loggerService.log).toHaveBeenCalledWith(
        `Executing migration: V1_0_0__${migration1}.cypher`,
      );

      const migrationFile = `${simplePath}/V1_0_0__${migration1}.cypher`;
      const migrationFileContent = await readFile(migrationFile, 'utf8');
      await writeFile(
        migrationFile,
        migrationFileContent + chance.string(),
        'utf8',
      );

      const migration2 = chance.word();
      await CommandTestFactory.run(app, ['create', migration2]);

      await CommandTestFactory.run(app, ['migrate']);
      expect(loggerService.error).toHaveBeenCalled();
      expect(loggerService.error).toHaveBeenCalledWith(
        `The checksum of V1_0_0__${migration1}.cypher does not match the checksum in the database`,
      );

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should fail if a migration was deleted after being applied', async () => {
      await createNeo4jConfigFile({
        path: simplePath,
      });
      const migration1 = chance.word();
      await CommandTestFactory.run(app, ['create', migration1]);

      await CommandTestFactory.run(app, ['migrate']);
      expect(loggerService.log).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith(
        `Migrations folder created: ${simplePath}`,
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        `Migration file created: ${simplePath}/V1_0_0__${migration1}.cypher`,
      );

      expect(loggerService.log).toHaveBeenCalledWith(
        `Executing migration: V1_0_0__${migration1}.cypher`,
      );

      const migrationFile = `${simplePath}/V1_0_0__${migration1}.cypher`;
      await rm(migrationFile);

      const migration2 = chance.word();
      await CommandTestFactory.run(app, ['create', migration2]);

      await CommandTestFactory.run(app, ['migrate']);
      expect(loggerService.error).toHaveBeenCalled();
      expect(loggerService.error).toHaveBeenCalledWith(
        `Missing migration: V1_0_0__${migration1}.cypher. Neo4j reports it as applied, but it is missing locally.`,
      );

      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
