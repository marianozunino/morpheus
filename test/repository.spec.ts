import { Connection, Node } from 'cypher-query-builder';
import { Repository } from '../src/repository';
import { BASELINE, MigrationLabel, Neo4jMigration } from '../src/types';

function buildQueryBuilder(override?: Record<string, jest.Mock>): any {
  const queryBuilder = {
    matchNode: jest.fn().mockReturnThis(),
    return: jest.fn().mockReturnThis(),
    raw: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    query: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    run: jest.fn().mockReturnThis(),
    createNode: jest.fn().mockReturnThis(),
    addClause: jest.fn().mockReturnThis(),
    ...override,
  };
  return queryBuilder;
}

const mockMyClass = Connection as jest.Mocked<typeof Connection>;

describe('repository', () => {
  let repository: Repository;
  const connectionMock = new mockMyClass('neo4j://localhost:port', {
    username: '',
    password: '',
  });
  beforeAll(() => {
    repository = new Repository(connectionMock);
  });
  describe('buildMigrationQuery', () => {
    it('should build a migration query', async () => {
      const mockDate = new Date('2022-01-01');
      const spy = jest
        .spyOn(global, 'Date')
        .mockImplementationOnce(() => mockDate as unknown as string);

      const migrationNode = {
        id: 'migrationId',
        name: 'migrationName',
        checksum: 'checksum',
        fileName: 'fileName',
      };
      const latestMigrationId = mockDate.getTime().toString();
      const expectedQuery = `MATCH (migration:__Neo4jMigration)
WHERE migration.id = '1640995200000'
WITH migration
CREATE (migration)-[:MIGRATED_TO { date: '1640995200000' }]->(newMigration:__Neo4jMigration { id: 'migrationId', name: 'migrationName', checksum: 'checksum', fileName: 'fileName' })
RETURN newMigration;`;

      const query = repository.buildMigrationQuery(
        migrationNode,
        latestMigrationId,
      );

      spy.mockRestore();
      expect(query).toBe(expectedQuery);
    });
  });
  describe('fetchBaselineNode', () => {
    it('should fetch the baseline node', async () => {
      const neo4jMigration: Neo4jMigration = {
        id: 'baselineId',
        name: 'baselineName',
        checksum: 'baselineChecksum',
        fileName: 'baselineFileName',
      };
      const baselineNode: Node<Neo4jMigration> = {
        identity: 'base',
        properties: neo4jMigration,
        labels: [MigrationLabel],
      };

      const queryBuilder: any = buildQueryBuilder({
        run: jest.fn().mockImplementationOnce(() => {
          return Promise.resolve([{ base: baselineNode }]);
        }),
      });

      jest
        .spyOn(connectionMock, 'query')
        .mockImplementationOnce(() => queryBuilder.query());

      const result = await repository.fetchBaselineNode();
      expect(queryBuilder.run).toHaveBeenCalled();
      expect(queryBuilder.matchNode).toHaveBeenCalled();
      expect(queryBuilder.matchNode).toHaveBeenCalledWith(
        'base',
        '__Neo4jMigration',
      );
      expect(queryBuilder.return).toHaveBeenCalled();
      expect(queryBuilder.return).toHaveBeenCalledWith('base');
      expect(queryBuilder.where).toHaveBeenCalled();
      expect(queryBuilder.where).toHaveBeenCalledWith({
        'base.id': 0,
      });
      expect(result).toEqual(neo4jMigration);
    });
    it('should return null if no baseline node is found', async () => {
      jest
        .spyOn(connectionMock, 'run')
        .mockImplementationOnce(() => Promise.resolve([]));
      const result = await repository.fetchBaselineNode();
      expect(connectionMock.run).toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('getPreviousMigrations', () => {
    it('should fetch all previous migrations', async () => {
      const neo4jMigration: Neo4jMigration = {
        id: 'baselineId',
        name: 'baselineName',
        checksum: 'baselineChecksum',
        fileName: 'baselineFileName',
      };
      const baselineNode: Node<Neo4jMigration> = {
        identity: 'base',
        properties: neo4jMigration,
        labels: [MigrationLabel],
      };

      const queryBuilder: any = buildQueryBuilder({
        run: jest.fn().mockImplementationOnce(() => {
          return Promise.resolve([{ migration: baselineNode }]);
        }),
      });

      jest
        .spyOn(connectionMock, 'query')
        .mockImplementationOnce(() => queryBuilder.query());

      const result = await repository.getPreviousMigrations('id');
      expect(queryBuilder.query).toHaveBeenCalled();
      expect(queryBuilder.raw).toHaveBeenCalled();
      expect(queryBuilder.raw)
        .toHaveBeenCalledWith(`MATCH (migration:__Neo4jMigration)
  WHERE toInteger(migration.id) <= toInteger(id)
  AND migration.checksum IS NOT NULL
  RETURN migration`);
      expect(queryBuilder.run).toHaveBeenCalled();
      expect(result).toEqual([neo4jMigration]);
    });
  });

  describe('createBaseNode', () => {
    it('should create a base node', async () => {
      const queryBuilder: any = buildQueryBuilder();
      jest
        .spyOn(connectionMock, 'query')
        .mockImplementationOnce(() => queryBuilder.query());
      await repository.createBaseNode();
      expect(queryBuilder.createNode).toHaveBeenCalled();
      expect(queryBuilder.createNode).toHaveBeenCalledWith(
        'base',
        MigrationLabel,
        { id: 0, name: BASELINE },
      );
    });
  });

  describe('getLatestMigration', () => {
    it('should fetch the latest migration', async () => {
      const neo4jMigration: Neo4jMigration = {
        id: 'baselineId',
        name: 'baselineName',
        checksum: 'baselineChecksum',
        fileName: 'baselineFileName',
      };
      const baselineNode: Node<Neo4jMigration> = {
        identity: 'base',
        properties: neo4jMigration,
        labels: [MigrationLabel],
      };

      const queryBuilder: any = buildQueryBuilder({
        run: jest.fn().mockImplementationOnce(() => {
          return Promise.resolve([{ migration: baselineNode }]);
        }),
      });
      jest
        .spyOn(connectionMock, 'query')
        .mockImplementationOnce(() => queryBuilder.query());
      const result = await repository.getLatestMigration();
      expect(queryBuilder.query).toHaveBeenCalled();

      expect(queryBuilder.matchNode).toHaveBeenCalled();
      expect(queryBuilder.matchNode).toHaveBeenCalledWith(
        'migration',
        MigrationLabel,
      );

      expect(queryBuilder.return).toHaveBeenCalled();
      expect(queryBuilder.return).toHaveBeenCalledWith('migration');

      expect(queryBuilder.limit).toHaveBeenCalled();
      expect(queryBuilder.limit).toHaveBeenCalledWith(1);

      expect(queryBuilder.orderBy).toHaveBeenCalled();
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'toInteger(migration.id)',
        'DESC',
      );
      expect(result).toEqual(neo4jMigration);
    });

    it('should return undefined if no migrations are found', async () => {
      const queryBuilder: any = buildQueryBuilder({
        run: jest.fn().mockImplementationOnce(() => {
          return Promise.resolve([]);
        }),
      });
      jest
        .spyOn(connectionMock, 'query')
        .mockImplementationOnce(() => queryBuilder.query());
      const result = await repository.getLatestMigration();
      expect(queryBuilder.query).toHaveBeenCalled();

      expect(queryBuilder.matchNode).toHaveBeenCalled();
      expect(queryBuilder.matchNode).toHaveBeenCalledWith(
        'migration',
        MigrationLabel,
      );

      expect(queryBuilder.return).toHaveBeenCalled();
      expect(queryBuilder.return).toHaveBeenCalledWith('migration');

      expect(queryBuilder.limit).toHaveBeenCalled();
      expect(queryBuilder.limit).toHaveBeenCalledWith(1);

      expect(queryBuilder.orderBy).toHaveBeenCalled();
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'toInteger(migration.id)',
        'DESC',
      );
      expect(result).toBeUndefined();
    });
  });

  describe('executeQueries', () => {
    it('should execute the queries within a transaction', async () => {
      const transactionMock = {
        run: jest.fn().mockImplementation(),
        commit: jest.fn().mockImplementation(),
      };
      const sessionMock = {
        beginTransaction: jest
          .fn()
          .mockImplementationOnce(() => transactionMock),
        close: jest.fn(),
      } as any;
      jest
        .spyOn(connectionMock, 'session')
        .mockImplementationOnce(() => sessionMock);
      await repository.executeQueries(['query1;', 'query2;']);
      expect(connectionMock.session).toHaveBeenCalled();
      expect(sessionMock.beginTransaction).toHaveBeenCalled();

      expect(transactionMock.run).toHaveBeenCalled();
      expect(transactionMock.run).toBeCalledTimes(2);
      expect(transactionMock.run).toHaveBeenCalledWith('query1;');
      expect(transactionMock.run).toHaveBeenCalledWith('query2;');

      expect(transactionMock.commit).toHaveBeenCalled();
      expect(transactionMock.commit).toBeCalledTimes(1);
    });

    it('should execute the queries without a transaction', async () => {
      const queryBuilder: any = buildQueryBuilder({
        run: jest.fn().mockImplementationOnce(() => {
          return Promise.resolve([]);
        }),
      });
      jest
        .spyOn(connectionMock, 'query')
        .mockImplementationOnce(() => queryBuilder.query());
      jest
        .spyOn(connectionMock, 'raw')
        .mockImplementationOnce(() => queryBuilder.raw());

      await repository.executeQueries(['query1;', 'query2;'], false);
      expect(connectionMock.raw).toHaveBeenCalled();
      expect(connectionMock.raw).toBeCalledTimes(2);
      expect(connectionMock.raw).toBeCalledWith('query1;');
      expect(connectionMock.raw).toBeCalledWith('query2;');
    });
  });

  describe('createConstraints', () => {
    it('should execute the queries within a transaction', async () => {
      jest.spyOn(repository, 'executeQueries').mockImplementation();
      await repository.createConstraints();
      expect(repository.executeQueries).toHaveBeenCalled();
    });
  });

  describe('executeQuery', () => {
    it('should execute the query', async () => {
      jest.spyOn(repository, 'executeQueries').mockImplementation();
      await repository.executeQuery('query');
      expect(repository.executeQueries).toHaveBeenCalled();
      expect(repository.executeQueries).toHaveBeenCalledWith(['query'], false);
    });
  });
});
