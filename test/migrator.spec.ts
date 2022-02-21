import * as config from '../src/config';
import * as utils from '../src/utils';
import { Repository } from '../src/repository';
import { Migrator } from '../src/migrator';
import { BASELINE, Neo4jMigrationNode } from '../src/types';
import { crc32 } from 'crc';
const mockUtils = utils;

jest.mock('../src/repository');

jest.mock('../src/neo4j', () => {
  return {
    Neo4j: {
      getConnection: () => {},
    },
  };
});

function generateNeo4jBaseline(
  override?: Partial<Neo4jMigrationNode>,
): Neo4jMigrationNode {
  return {
    checksum: '123',
    version: BASELINE,
    description: 'description',
    source: 'source',
    type: 'CYPHER',
    ...override,
  };
}

jest.spyOn(config, 'readMorpheusConfig').mockImplementationOnce(() => ({
  scheme: 'neo4j',
  host: 'localhost',
  port: 7474,
  username: 'neo4j',
  password: 'password',
}));

jest.spyOn(console, 'log');

describe('migrator', () => {
  it('should be defined', () => {
    const migrator = new Migrator();
    expect(migrator).toBeDefined();
  });
  describe('migrate', () => {
    it('should create base node if it does not exist', async () => {
      mockUtils.getFileNamesFromMigrationsFolder = jest
        .fn()
        .mockReturnValue(Promise.resolve([]));

      Repository.prototype.getPreviousMigrations = jest
        .fn()
        .mockImplementationOnce(() => []);

      Repository.prototype.getLatestMigration = jest
        .fn()
        .mockImplementationOnce(generateNeo4jBaseline);

      Repository.prototype.createBaseNode = jest
        .fn()
        .mockImplementationOnce(undefined);

      Repository.prototype.createConstraints = jest
        .fn()
        .mockImplementationOnce(undefined);

      Repository.prototype.fetchBaselineNode = jest
        .fn()
        .mockImplementationOnce(undefined);

      const migrator = new Migrator();
      await migrator.migrate();

      expect(Repository.prototype.createBaseNode).toHaveBeenCalled();
      expect(Repository.prototype.createConstraints).toHaveBeenCalled();
    });

    describe('when migrations directory is empty', () => {
      beforeEach(() => {
        mockUtils.getFileNamesFromMigrationsFolder = jest
          .fn()
          .mockReturnValue(Promise.resolve(['asd']));
      });
      it('should not run any migrations', async () => {
        mockUtils.getFileNamesFromMigrationsFolder = jest
          .fn()
          .mockReturnValue(Promise.resolve([]));

        Repository.prototype.getPreviousMigrations = jest
          .fn()
          .mockImplementationOnce(() => []);

        Repository.prototype.getLatestMigration = jest
          .fn()
          .mockImplementationOnce(generateNeo4jBaseline);

        Repository.prototype.fetchBaselineNode = jest
          .fn()
          .mockImplementationOnce(generateNeo4jBaseline);

        const migrator = new Migrator();
        await migrator.migrate();

        expect(Repository.prototype.getPreviousMigrations).toHaveBeenCalled();
        expect(Repository.prototype.getPreviousMigrations).toHaveBeenCalled();
        expect(console.log).toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith('Database is up to date');
      });
    });
    describe('when directory has migrations', () => {
      describe('and some migrations are pending', () => {
        afterEach(() => {
          jest.clearAllMocks();
        });
        it('should fail to execute migrations with wrong naming', async () => {
          jest.spyOn(mockUtils, 'getFileContentAndVersion');
          mockUtils.getFileNamesFromMigrationsFolder = jest
            .fn()
            .mockReturnValue(Promise.resolve(['wrong_name']));

          Repository.prototype.getPreviousMigrations = jest
            .fn()
            .mockImplementationOnce(() => []);

          Repository.prototype.getLatestMigration = jest
            .fn()
            .mockImplementationOnce(generateNeo4jBaseline);

          Repository.prototype.fetchBaselineNode = jest
            .fn()
            .mockImplementationOnce(generateNeo4jBaseline);

          const migrator = new Migrator();
          await expect(
            migrator.migrate(),
          ).rejects.toThrowErrorMatchingInlineSnapshot(`"Invalid file name"`);
        });
        it('should execute old and new migrations', async () => {
          mockUtils.getFileContentAndVersion = jest.fn().mockReturnValue({
            fileContent: 'content;\n',
            version: '1.0.0',
          });
          mockUtils.getFileNamesFromMigrationsFolder = jest
            .fn()
            .mockReturnValue(Promise.resolve(['V1_0_0__migrationName.cypher']));

          Repository.prototype.getPreviousMigrations = jest
            .fn()
            .mockImplementationOnce(() => []);

          Repository.prototype.getLatestMigration = jest
            .fn()
            .mockImplementationOnce(generateNeo4jBaseline);

          Repository.prototype.getTransaction = jest.fn().mockReturnValue({
            run: jest.fn(),
            commit: jest.fn(),
          });
          Repository.prototype.executeQueries = jest.fn();
          Repository.prototype.executeQuery = jest.fn();
          Repository.prototype.buildMigrationQuery = jest.fn();

          Repository.prototype.fetchBaselineNode = jest
            .fn()
            .mockImplementationOnce(generateNeo4jBaseline);

          const migrator = new Migrator();
          await migrator.migrate();

          expect(Repository.prototype.getPreviousMigrations).toHaveBeenCalled();
          expect(Repository.prototype.getPreviousMigrations).toHaveBeenCalled();
          expect(console.log).toHaveBeenCalled();
          expect(console.log).toHaveBeenCalledWith(
            'Executing migration: migrationName',
          );
          expect(Repository.prototype.getTransaction).toHaveBeenCalled();
          expect(Repository.prototype.executeQueries).toHaveBeenCalled();
          expect(Repository.prototype.executeQuery).toHaveBeenCalled();
          expect(Repository.prototype.buildMigrationQuery).toHaveBeenCalled();
          expect(Repository.prototype.getTransaction).toHaveBeenCalled();
        });
        it('should exit if checksums of old migrations are invalid', async () => {
          jest.spyOn(process, 'exit').mockImplementation();
          mockUtils.getFileContentAndVersion = jest.fn().mockReturnValue({
            fileContent: 'content;\n',
            version: '1.0.0',
          });
          mockUtils.getFileNamesFromMigrationsFolder = jest
            .fn()
            .mockReturnValue(Promise.resolve(['V1_0_0__migrationName.cypher']));

          Repository.prototype.getPreviousMigrations = jest
            .fn()
            .mockImplementationOnce(() => [
              generateNeo4jBaseline({ version: '1.0.0' }),
            ]);

          Repository.prototype.getLatestMigration = jest
            .fn()
            .mockImplementationOnce(generateNeo4jBaseline);

          Repository.prototype.getTransaction = jest.fn().mockReturnValue({
            run: jest.fn(),
            commit: jest.fn(),
          });
          Repository.prototype.executeQueries = jest.fn();
          Repository.prototype.executeQuery = jest.fn();
          Repository.prototype.buildMigrationQuery = jest.fn();

          Repository.prototype.fetchBaselineNode = jest
            .fn()
            .mockImplementationOnce(generateNeo4jBaseline);

          const migrator = new Migrator();
          await migrator.migrate();

          expect(Repository.prototype.getPreviousMigrations).toHaveBeenCalled();
          expect(Repository.prototype.getPreviousMigrations).toHaveBeenCalled();
          expect(console.log).toHaveBeenCalled();
          expect(console.log).toHaveBeenCalledWith(
            'Executing migration: migrationName',
          );
          expect(Repository.prototype.getTransaction).toHaveBeenCalled();
          expect(Repository.prototype.executeQueries).toHaveBeenCalled();
          expect(Repository.prototype.executeQuery).toHaveBeenCalled();
          expect(Repository.prototype.buildMigrationQuery).toHaveBeenCalled();
          expect(Repository.prototype.getTransaction).toHaveBeenCalled();
          expect(process.exit).toHaveBeenCalledWith(1);
        });
      });
      describe('and no migrations are pending', () => {
        afterEach(() => {
          jest.clearAllMocks();
        });
        it('should verify checksums of old migrations', async () => {
          jest.spyOn(process, 'exit').mockImplementation();
          mockUtils.getFileContentAndVersion = jest.fn().mockReturnValue({
            fileContent: 'content;\n',
            version: '1.0.0',
          });
          mockUtils.getFileNamesFromMigrationsFolder = jest
            .fn()
            .mockReturnValue(Promise.resolve(['V1_0_0__migrationName.cypher']));

          Repository.prototype.getPreviousMigrations = jest
            .fn()
            .mockImplementationOnce(() => [
              generateNeo4jBaseline({
                version: '1.0.0',
                checksum: crc32('content').toString(),
              }),
            ]);

          Repository.prototype.getLatestMigration = jest
            .fn()
            .mockImplementationOnce(() => [
              generateNeo4jBaseline({
                version: '1.0.0',
                checksum: crc32('content').toString(),
              }),
            ]);

          Repository.prototype.getTransaction = jest.fn().mockReturnValue({
            run: jest.fn(),
            commit: jest.fn(),
          });
          Repository.prototype.executeQueries = jest.fn();
          Repository.prototype.executeQuery = jest.fn();
          Repository.prototype.buildMigrationQuery = jest.fn();

          Repository.prototype.fetchBaselineNode = jest
            .fn()
            .mockImplementationOnce(generateNeo4jBaseline);

          const migrator = new Migrator();
          await migrator.migrate();

          expect(Repository.prototype.getPreviousMigrations).toHaveBeenCalled();
          expect(Repository.prototype.getPreviousMigrations).toHaveBeenCalled();
          expect(process.exit).not.toHaveBeenCalled();
        });
      });
    });
  });
});
