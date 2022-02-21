const verifyConnectivityMock = jest.fn();
const closeConnectionMock = jest.fn();
jest.mock('cypher-query-builder', () => {
  return {
    Connection: jest.fn().mockImplementation(() => {
      return {
        driver: {
          verifyConnectivity: verifyConnectivityMock,
        },
        close: closeConnectionMock,
      };
    }),
  };
});

import * as config from '../src/config';
import { Neo4j } from '../src/neo4j';

describe('Neo4J', () => {
  it('should be defined', () => {
    expect(Neo4j).toBeDefined();
  });

  // before each reset singleton instance
  beforeEach(() => {
    Neo4j['connection'] = undefined;
    closeConnectionMock.mockClear();
  });

  describe('getConnection', () => {
    it('should get only one connection ', async () => {
      jest.spyOn(config, 'readMorpheusConfig').mockImplementationOnce(() => ({
        scheme: 'neo4j',
        host: 'localhost',
        port: 7474,
        username: 'neo4j',
        password: 'password',
      }));

      await Neo4j.getConnection();
      const connection = await Neo4j.getConnection();
      expect(connection).toBeDefined();
      expect(verifyConnectivityMock).toHaveBeenCalledTimes(1);
      expect(config.readMorpheusConfig).toHaveBeenCalledTimes(1);
    });

    it('should get a connection when a valid config was found', async () => {
      jest.spyOn(config, 'readMorpheusConfig').mockImplementationOnce(() => ({
        scheme: 'neo4j',
        host: 'localhost',
        port: 7474,
        username: 'neo4j',
        password: 'password',
      }));

      const connection = await Neo4j.getConnection();
      expect(connection).toBeDefined();
    });

    it('should fail get a connection when an invalid config was found', async () => {
      jest.spyOn(config, 'readMorpheusConfig').mockImplementationOnce(() => ({
        scheme: 'neo4j',
        host: 'localhost',
        port: 404,
        username: 'neo4j',
        password: 'password',
      }));

      verifyConnectivityMock.mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });
      await expect(Neo4j.getConnection()).rejects.toThrow();
    });

    it('should close the connection', async () => {
      jest.spyOn(config, 'readMorpheusConfig').mockImplementationOnce(() => ({
        scheme: 'neo4j',
        host: 'localhost',
        port: 404,
        username: 'neo4j',
        password: 'password',
      }));
      await Neo4j.getConnection();
      await Neo4j.close();
      expect(closeConnectionMock).toHaveBeenCalledTimes(1);
    });

    it("should not close the connection if there isn't one", async () => {
      await Neo4j.close();
      expect(closeConnectionMock).toHaveBeenCalledTimes(0);
    });
  });
});
