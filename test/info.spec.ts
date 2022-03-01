import * as config from '../src/config';
import * as utils from '../src/utils';
import { Neo4jMigrationNode, Neo4jMigrationRelation } from '../src/types';
import { Repository } from '../src/repository';
import { Connection } from 'cypher-query-builder';
import { Info } from '../src/info';
import { resolve } from 'path';
import rimraf from 'rimraf';
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
function infoBuilder() {
  return new Info(mockedRepository);
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
    jest.resetAllMocks();
    rimraf.sync(resolve(process.cwd(), 'neo4j/migrations/*'));
    jest.restoreAllMocks();
  });
  it('should be defined', () => {
    const migrator = new Info(new MockedRepository(null));
    expect(migrator).toBeDefined();
  });
  describe('getInfo', () => {
    it('should not fetch migrations when there are no files', async () => {
      jest.spyOn(console, 'log');
      jest
        .spyOn(mockUtils, 'getFileNamesFromMigrationsFolder')
        .mockReturnValue(Promise.resolve([]));

      const info = infoBuilder();
      await info.getInfo();
      expect(console.log).toHaveBeenCalledWith('No migrations found');
      expect(mockedRepository.getMigrationInfo).not.toHaveBeenCalled();
    });

    it('should fetch migrations when there are files', async () => {
      jest.spyOn(console, 'log');
      await utils.generateMigration('one');
      await utils.generateMigration('two');

      const migrationNode: Neo4jMigrationNode = {
        version: '1.0.0',
        description: 'one',
        checksum: 'checksum',
        type: 'CYPHER',
        source: 'source',
      };

      const relationNode: Neo4jMigrationRelation = {
        at: {
          day: 1,
          month: 1,
          year: 1970,
          hour: 0,
          minute: 0,
          second: 0,
          nanosecond: 0,
          timeZoneId: 'UTC',
          timeZoneOffsetSeconds: '',
        },
        in: {
          days: 0,
          months: 0,
          nanoseconds: 554000000,
          seconds: 1,
        },
      };

      mockedRepository.getMigrationInfo = jest
        .fn()
        .mockReturnValue([{ node: migrationNode, relation: relationNode }]);

      const info = infoBuilder();
      await info.getInfo();
      expect(console.log).not.toHaveBeenCalledWith('No migrations found');
      expect(mockedRepository.getMigrationInfo).toHaveBeenCalled();
    });
  });
});
