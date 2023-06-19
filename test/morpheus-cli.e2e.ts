import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import { exists, readFile, rename, rm, writeFile } from 'fs-extra';
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
import { MigrationState } from '../src/types';

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
  });

  afterAll(closeNeo4j);
  beforeAll(openNeo4j);

  describe('uses env variables if they are set', () => {
    it('fails if the database is not reachable', async () => {
      process.env.MORPHEUS_SCHEME = 'bolt';
      process.env.MORPHEUS_HOST = 'localhost';
      process.env.MORPHEUS_PORT = '8888';
      process.env.MORPHEUS_USERNAME = 'neo4j';
      process.env.MORPHEUS_PASSWORD = 'neo4j';
      process.env.MORPHEUS_MIGRATIONS_PATH = 'migrations';

      await CommandTestFactory.run(app, ['info']);

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to connect to server(.*)/),
      );
    });

    it('succeeds if the database is reachable', async () => {
      process.env.MORPHEUS_SCHEME = process.env.TEST_NEO4J_SCHEME;
      process.env.MORPHEUS_HOST = process.env.TEST_NEO4J_HOST;
      process.env.MORPHEUS_PORT = process.env.TEST_NEO4J_PORT;
      process.env.MORPHEUS_USERNAME = process.env.TEST_NEO4J_USERNAME;
      process.env.MORPHEUS_PASSWORD = process.env.TEST_NEO4J_PASSWORD;

      await CommandTestFactory.run(app, ['info']);

      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Database is up to date'),
      );
    });

    it('fails is the config is not valid', async () => {
      process.env.MORPHEUS_SCHEME = chance.word();
      process.env.MORPHEUS_HOST = 'localhost';
      process.env.MORPHEUS_PORT = '7687';
      process.env.MORPHEUS_USERNAME = 'neo4j';
      process.env.MORPHEUS_PASSWORD = 'neo4j';
      process.env.MORPHEUS_MIGRATIONS_PATH = 'migrations';
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await CommandTestFactory.run(app, ['info']);

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid config'),
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '"scheme" must be one of [neo4j, neo4j+s, neo4j+ssc, bolt, bolt+s, bolt+ssc]',
      );
    });

    it('fails if a required env variable is missing', async () => {
      process.env.MORPHEUS_SCHEME = 'neo4j';
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await CommandTestFactory.run(app, ['info']);

      expect(consoleErrorSpy).toHaveBeenCalledWith('"host" is required');

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid config'),
      );
    });
  });

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
        port: 9999,
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

    it('should execute migrations in the correct order (semver)', async () => {
      await createNeo4jConfigFile({
        path: simplePath,
      });
      const migration1 = chance.word();
      await CommandTestFactory.run(app, ['create', migration1]);

      const migration2 = chance.word();
      await CommandTestFactory.run(app, ['create', migration2]);

      const migration3 = chance.word();
      await CommandTestFactory.run(app, ['create', migration3]);

      // rename file to 1.9.0
      const migrationFile = `${simplePath}/V1_0_0__${migration1}.cypher`;
      await rename(migrationFile, `${simplePath}/V1_9_0__${migration1}.cypher`);

      // rename file to 1.10.0
      const migrationFile2 = `${simplePath}/V2_0_0__${migration2}.cypher`;
      await rename(
        migrationFile2,
        `${simplePath}/V1_10_0__${migration2}.cypher`,
      );

      // rename file to 1.11.0
      const migrationFile3 = `${simplePath}/V3_0_0__${migration3}.cypher`;
      await rename(
        migrationFile3,
        `${simplePath}/V1_11_0__${migration3}.cypher`,
      );

      await CommandTestFactory.run(app, ['migrate']);

      expect(loggerService.log).toHaveBeenCalledWith(
        `Executing migration: V1_9_0__${migration1}.cypher`,
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        `Executing migration: V1_10_0__${migration2}.cypher`,
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        `Executing migration: V1_11_0__${migration3}.cypher`,
      );

      await CommandTestFactory.run(app, ['migrate']);
      expect(loggerService.log).toHaveBeenCalledWith('Database is up to date');
    });
  });

  describe('info command', () => {
    it('should fail to info if .morpheus.json does not exist', async () => {
      await CommandTestFactory.run(app, ['info']);

      expect(loggerService.error).toHaveBeenCalled();
      expect(loggerService.error).toHaveBeenCalledWith(
        `Couldn't find a valid .morpheus.json file.
Issue the following command to create one:
> morpheus init`,
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should fail to info if it cannot connect to the database', async () => {
      await CommandTestFactory.run(app, ['init']);
      await CommandTestFactory.run(app, ['info']);

      expect(loggerService.error).toHaveBeenCalled();
      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringMatching(
          /(.*)The client is unauthorized due to authentication failure(.*)|(.*)Could not perform discovery(.*)/,
        ),
      );
    });

    it('should info that there are no migrations', async () => {
      await createNeo4jConfigFile({
        path: simplePath,
      });
      await CommandTestFactory.run(app, ['info']);

      expect(loggerService.log).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Database is up to date, but there are no migrations in the migrations folder',
        ),
      );
    });

    it('should info about the applied migrations', async () => {
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

      const consoleTableSpy = jest.spyOn(console, 'table').mockImplementation();

      await CommandTestFactory.run(app, ['info']);
      expect(consoleTableSpy).toHaveBeenCalled();
      expect(consoleTableSpy).toHaveBeenCalledWith([
        expect.objectContaining({
          Source: `V1_0_0__${migration1}.cypher`,
          State: MigrationState.APPLIED,
          Description: migration1,
          Type: `CYPHER`,
          Version: '1.0.0',
          InstalledOn: expect.any(String),
          ExecutionTime: expect.any(String),
        }),
      ]);
    });

    it('should info about the applied migrations and the pending migrations', async () => {
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

      const migration2 = chance.word();
      await CommandTestFactory.run(app, ['create', migration2]);

      const consoleTableSpy = jest.spyOn(console, 'table').mockImplementation();

      await CommandTestFactory.run(app, ['info']);
      expect(consoleTableSpy).toHaveBeenCalled();
      expect(consoleTableSpy).toHaveBeenCalledWith([
        expect.objectContaining({
          Source: `V1_0_0__${migration1}.cypher`,
          State: MigrationState.APPLIED,
          Description: migration1,
          Type: `CYPHER`,
          Version: '1.0.0',
          InstalledOn: expect.any(String),
          ExecutionTime: expect.any(String),
        }),
        expect.objectContaining({
          Source: `V2_0_0__${migration2}.cypher`,
          State: MigrationState.PENDING,
          Description: migration2,
          Type: `CYPHER`,
          Version: '2.0.0',
          InstalledOn: 'N/A',
          ExecutionTime: 'N/A',
        }),
      ]);
    });

    it('should info about applied but missing local migrations', async () => {
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

      await rm(simplePath, { recursive: true, force: true });

      const consoleTableSpy = jest.spyOn(console, 'table').mockImplementation();

      await CommandTestFactory.run(app, ['info']);
      expect(loggerService.error).toHaveBeenCalledWith(
        'There are more migrations in the database than in the migrations folder',
      );
      expect(consoleTableSpy).toHaveBeenCalled();
      expect(consoleTableSpy).toHaveBeenCalledWith([
        expect.objectContaining({
          Source: `V1_0_0__${migration1}.cypher`,
          Description: migration1,
          Type: `CYPHER`,
          Version: '1.0.0',
          State: MigrationState.APPLIED,
        }),
      ]);
    });
  });

  describe('clean command', () => {
    it('should fail to clean if .morpheus.json does not exist', async () => {
      await CommandTestFactory.run(app, ['clean']);

      expect(loggerService.error).toHaveBeenCalled();
      expect(loggerService.error).toHaveBeenCalledWith(
        `Couldn't find a valid .morpheus.json file.
Issue the following command to create one:
> morpheus init`,
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should fail to clean if it cannot connect to the database', async () => {
      await CommandTestFactory.run(app, ['init']);
      await CommandTestFactory.run(app, ['clean']);

      expect(loggerService.error).toHaveBeenCalled();
      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringMatching(
          /(.*)The client is unauthorized due to authentication failure(.*)|(.*)Could not perform discovery(.*)/,
        ),
      );
    });

    it('should clean the database - drop nodes and constraints', async () => {
      await createNeo4jConfigFile({
        path: simplePath,
      });
      const migration1 = chance.word();
      await CommandTestFactory.run(app, ['create', migration1]);
      await CommandTestFactory.run(app, ['migrate']);

      await CommandTestFactory.run(app, ['clean']);

      expect(loggerService.log).toHaveBeenCalledWith('Dropped chain');
      expect(loggerService.log).toHaveBeenCalledWith('Dropped constraints');
    });

    it('should clean the database - drop nodes and keep constraints', async () => {
      await createNeo4jConfigFile({
        path: simplePath,
      });
      const migration1 = chance.word();
      await CommandTestFactory.run(app, ['create', migration1]);
      await CommandTestFactory.run(app, ['migrate']);

      await CommandTestFactory.run(app, ['clean', '-d', 'false']);

      expect(loggerService.log).toHaveBeenCalledWith('Dropped chain');
      expect(loggerService.log).not.toHaveBeenCalledWith('Dropped constraints');
    });

    it('should fail if the drop-constraints flag is not a boolean', async () => {
      await createNeo4jConfigFile({
        path: simplePath,
      });
      const migration1 = chance.word();
      await CommandTestFactory.run(app, ['create', migration1]);
      await CommandTestFactory.run(app, ['migrate']);

      await CommandTestFactory.run(app, ['clean', '-d', 'foo']);

      expect(loggerService.error).toHaveBeenCalledWith(
        `Invalid value for boolean option drop-constraints: foo`,
      );
    });
  });
});
