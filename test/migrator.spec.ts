import * as config from '../src/config';
import * as utils from '../src/utils';
import { RepositoryMock } from './__mocks__/repository';
import { Migrator } from '../src/migrator';
import { BASELINE, Neo4jMigrationNode } from '../src/types';
import { crc32 } from 'crc';
const mockUtils = utils;

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

const repository = new RepositoryMock();
function migratorBuilder(): Migrator {
  return new Migrator(repository);
}

describe('migrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(repository, 'getTransaction');
    jest.spyOn(repository, 'executeQueries');
    jest.spyOn(repository, 'executeQuery');
    jest.spyOn(repository, 'buildMigrationQuery');
  });
  it('should be defined', () => {
    const migrator = new Migrator(repository);
    expect(migrator).toBeDefined();
  });
  describe('migrate', () => {
    it('should create base node if it does not exist', async () => {
      mockUtils.getFileNamesFromMigrationsFolder = jest
        .fn()
        .mockReturnValue(Promise.resolve([]));

      jest
        .spyOn(repository, 'getLatestMigration')
        .mockReturnValueOnce(Promise.resolve(generateNeo4jBaseline()));

      jest.spyOn(repository, 'createBaseNode').mockReturnValueOnce(undefined);
      jest
        .spyOn(repository, 'createConstraints')
        .mockReturnValueOnce(undefined);

      jest
        .spyOn(repository, 'getPreviousMigrations')
        .mockReturnValueOnce(Promise.resolve([]));

      jest
        .spyOn(repository, 'fetchBaselineNode')
        .mockImplementationOnce(() => undefined);

      const migrator = migratorBuilder();
      await migrator.migrate();

      expect(repository.createBaseNode).toHaveBeenCalled();
      expect(repository.createConstraints).toHaveBeenCalled();
      expect(repository.createBaseNode).toHaveBeenCalledTimes(1);
      expect(repository.createConstraints).toHaveBeenCalledTimes(1);
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

        jest
          .spyOn(repository, 'getPreviousMigrations')
          .mockReturnValueOnce(Promise.resolve([]));

        jest
          .spyOn(repository, 'getLatestMigration')
          .mockReturnValueOnce(Promise.resolve(generateNeo4jBaseline()));

        jest
          .spyOn(repository, 'fetchBaselineNode')
          .mockReturnValueOnce(Promise.resolve(generateNeo4jBaseline()));

        const migrator = migratorBuilder();
        await migrator.migrate();

        expect(repository.getPreviousMigrations).toHaveBeenCalled();
        expect(repository.getPreviousMigrations).toHaveBeenCalled();
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

          jest
            .spyOn(repository, 'getPreviousMigrations')
            .mockReturnValueOnce(Promise.resolve([]));

          jest
            .spyOn(repository, 'getLatestMigration')
            .mockReturnValueOnce(Promise.resolve(generateNeo4jBaseline()));

          jest
            .spyOn(repository, 'fetchBaselineNode')
            .mockReturnValueOnce(Promise.resolve(generateNeo4jBaseline()));

          const migrator = migratorBuilder();
          await expect(
            migrator.migrate(),
          ).rejects.toThrowErrorMatchingInlineSnapshot(`"Invalid file name"`);
        });
        it.only('should execute old and new migrations', async () => {
          mockUtils.getFileContentAndVersion = jest.fn().mockReturnValue({
            fileContent: 'content;\n',
            version: '1.0.0',
          });
          mockUtils.getFileNamesFromMigrationsFolder = jest
            .fn()
            .mockReturnValue(Promise.resolve(['V1_0_0__migrationName.cypher']));

          jest
            .spyOn(repository, 'getPreviousMigrations')
            .mockReturnValueOnce(Promise.resolve([]));

          jest
            .spyOn(repository, 'getLatestMigration')
            .mockReturnValueOnce(Promise.resolve(generateNeo4jBaseline()));

          jest
            .spyOn(repository, 'fetchBaselineNode')
            .mockReturnValueOnce(Promise.resolve(generateNeo4jBaseline()));

          // Repository.prototype.executeQueries = jest.fn();
          // Repository.prototype.executeQuery = jest.fn();

          const migrator = migratorBuilder();
          await migrator.migrate();

          expect(console.log).toHaveBeenCalled();
          expect(console.log).toHaveBeenCalledWith(
            'Executing migration: migrationName',
          );
          expect(repository.getTransaction).toHaveBeenCalled();
          expect(repository.executeQueries).toHaveBeenCalled();
          expect(repository.executeQuery).toHaveBeenCalled();
          expect(repository.buildMigrationQuery).toHaveBeenCalled();
          expect(repository.getTransaction).toHaveBeenCalled();
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

          jest
            .spyOn(repository, 'getPreviousMigrations')
            .mockReturnValueOnce(
              Promise.resolve([generateNeo4jBaseline({ version: '1.0.0' })]),
            );

          jest
            .spyOn(repository, 'getLatestMigration')
            .mockReturnValueOnce(Promise.resolve(generateNeo4jBaseline()));

          jest
            .spyOn(repository, 'fetchBaselineNode')
            .mockReturnValueOnce(Promise.resolve(generateNeo4jBaseline()));

          const migrator = migratorBuilder();
          await migrator.migrate();

          expect(console.log).toHaveBeenCalled();
          expect(console.log).toHaveBeenCalledWith(
            'Executing migration: migrationName',
          );
          expect(repository.getTransaction).toHaveBeenCalled();
          expect(repository.executeQueries).toHaveBeenCalled();
          expect(repository.executeQuery).toHaveBeenCalled();
          expect(repository.buildMigrationQuery).toHaveBeenCalled();
          expect(repository.getTransaction).toHaveBeenCalled();
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

          jest.spyOn(repository, 'getPreviousMigrations').mockReturnValueOnce(
            Promise.resolve([
              generateNeo4jBaseline({
                version: '1.0.0',
                checksum: crc32('content').toString(),
              }),
            ]),
          );

          jest.spyOn(repository, 'getLatestMigration').mockReturnValueOnce(
            Promise.resolve(
              generateNeo4jBaseline({
                version: '1.0.0',
                checksum: crc32('content').toString(),
              }),
            ),
          );

          jest
            .spyOn(repository, 'fetchBaselineNode')
            .mockReturnValueOnce(Promise.resolve(generateNeo4jBaseline()));

          const migrator = migratorBuilder();
          await migrator.migrate();

          expect(repository.getPreviousMigrations).toHaveBeenCalled();
          expect(process.exit).not.toHaveBeenCalled();
        });
      });
    });
  });
});
