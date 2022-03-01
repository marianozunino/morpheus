import * as config from '../src/config';
import * as utils from '../src/utils';
import { Migrator } from '../src/migrator';
import { BASELINE, Neo4jMigrationNode } from '../src/types';
import { crc32 } from 'crc';
import { Repository } from '../src/repository';
import { Connection } from 'cypher-query-builder';
const mockUtils = utils;

jest.mock('../src/neo4j', () => {
  return {
    Neo4j: {
      getConnection: () => jest.fn(),
    },
  };
});

jest.mock('../src/repository');
jest.mock('cypher-query-builder');
const MockedRepository = Repository as jest.MockedClass<typeof Repository>;
const MockedConnection = Connection as jest.MockedClass<typeof Connection>;

const mockedConnection = new MockedConnection(null, null);
const mockedRepository = new MockedRepository(mockedConnection);
function migratorBuilder() {
  return new Migrator(mockedRepository);
}

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
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should be defined', () => {
    const migrator = new Migrator(new MockedRepository(null));
    expect(migrator).toBeDefined();
  });
  describe('migrate', () => {
    it('should create base node if it does not exist', async () => {
      mockUtils.getFileNamesFromMigrationsFolder = jest
        .fn()
        .mockReturnValue(Promise.resolve([]));
      mockedRepository.getLatestMigration = jest
        .fn()
        .mockReturnValueOnce(generateNeo4jBaseline());
      mockedRepository.createBaseNode = jest
        .fn()
        .mockResolvedValueOnce(undefined);
      mockedRepository.createConstraints = jest
        .fn()
        .mockResolvedValueOnce(undefined);
      mockedRepository.getPreviousMigrations = jest
        .fn()
        .mockResolvedValueOnce([]);
      mockedRepository.fetchBaselineNode = jest
        .fn()
        .mockResolvedValueOnce(undefined);

      const migrator = migratorBuilder();
      await migrator.migrate();
      expect(mockedRepository.createBaseNode).toHaveBeenCalled();
      expect(mockedRepository.createConstraints).toHaveBeenCalled();
      expect(mockedRepository.createBaseNode).toHaveBeenCalledTimes(1);
      expect(mockedRepository.createConstraints).toHaveBeenCalledTimes(1);
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

        mockedRepository.getLatestMigration = jest
          .fn()
          .mockReturnValueOnce(generateNeo4jBaseline());
        mockedRepository.getPreviousMigrations = jest
          .fn()
          .mockResolvedValueOnce([]);
        mockedRepository.fetchBaselineNode = jest
          .fn()
          .mockResolvedValueOnce(generateNeo4jBaseline());

        const migrator = migratorBuilder();
        await migrator.migrate();
        expect(mockedRepository.getPreviousMigrations).toHaveBeenCalled();
        expect(mockedRepository.getPreviousMigrations).toHaveBeenCalled();
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

          mockedRepository.getLatestMigration = jest
            .fn()
            .mockReturnValueOnce(generateNeo4jBaseline());
          mockedRepository.getPreviousMigrations = jest
            .fn()
            .mockResolvedValueOnce([]);
          mockedRepository.fetchBaselineNode = jest
            .fn()
            .mockResolvedValueOnce(generateNeo4jBaseline());

          const migrator = migratorBuilder();
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

          mockedRepository.getLatestMigration = jest
            .fn()
            .mockReturnValueOnce(generateNeo4jBaseline());
          mockedRepository.getPreviousMigrations = jest
            .fn()
            .mockResolvedValueOnce([]);
          mockedRepository.fetchBaselineNode = jest
            .fn()
            .mockResolvedValueOnce(generateNeo4jBaseline());

          mockedRepository.getTransaction = jest.fn().mockReturnValue({
            run: jest.fn(),
            commit: jest.fn(),
          });

          const migrator = migratorBuilder();
          await migrator.migrate();
          expect(console.log).toHaveBeenCalled();
          expect(console.log).toHaveBeenCalledWith(
            'Executing migration: migrationName',
          );
          expect(mockedRepository.getTransaction).toHaveBeenCalled();
          expect(mockedRepository.executeQueries).toHaveBeenCalled();
          expect(mockedRepository.executeQuery).toHaveBeenCalled();
          expect(mockedRepository.buildMigrationQuery).toHaveBeenCalled();
          expect(mockedRepository.getTransaction).toHaveBeenCalled();
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

          mockedRepository.getPreviousMigrations = jest
            .fn()
            .mockReturnValueOnce([generateNeo4jBaseline({ version: '1.0.0' })]);
          mockedRepository.getLatestMigration = jest
            .fn()
            .mockReturnValueOnce(generateNeo4jBaseline());
          mockedRepository.fetchBaselineNode = jest
            .fn()
            .mockResolvedValueOnce(generateNeo4jBaseline());

          const migrator = migratorBuilder();
          await migrator.migrate();
          expect(console.log).toHaveBeenCalled();
          expect(console.log).toHaveBeenCalledWith(
            'Executing migration: migrationName',
          );
          expect(mockedRepository.getTransaction).toHaveBeenCalled();
          expect(mockedRepository.executeQueries).toHaveBeenCalled();
          expect(mockedRepository.executeQuery).toHaveBeenCalled();
          expect(mockedRepository.buildMigrationQuery).toHaveBeenCalled();
          expect(mockedRepository.getTransaction).toHaveBeenCalled();
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

          mockedRepository.getPreviousMigrations = jest
            .fn()
            .mockReturnValueOnce([
              generateNeo4jBaseline({
                version: '1.0.0',
                checksum: crc32('content').toString(),
              }),
            ]);
          mockedRepository.getLatestMigration = jest.fn().mockReturnValueOnce(
            generateNeo4jBaseline({
              version: '1.0.0',
              checksum: crc32('content').toString(),
            }),
          );
          mockedRepository.fetchBaselineNode = jest
            .fn()
            .mockResolvedValueOnce(generateNeo4jBaseline());

          jest;
          const migrator = migratorBuilder();
          await migrator.migrate();
          expect(mockedRepository.getPreviousMigrations).toHaveBeenCalled();
          expect(process.exit).not.toHaveBeenCalled();
        });
      });
    });
  });
});
