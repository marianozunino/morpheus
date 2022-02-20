import { Connection } from 'cypher-query-builder';
import { Driver } from 'neo4j-driver-core';
import { readMorpheusConfig } from './config';

export type Neo4jScheme =
  | 'neo4j'
  | 'neo4j+s'
  | 'neo4j+ssc'
  | 'bolt'
  | 'bolt+s'
  | 'bolt+ssc';

export interface Neo4jConfig {
  database?: string;
  scheme: Neo4jScheme;
  host: string;
  port: number;
  username: string;
  password: string;
}

type ConnectionWithDriver = Connection & { driver: Driver };

export class ConnectionError extends Error {
  private details: string;
  constructor(oldError: Error) {
    super();
    this.name = 'ConnectionError';
    this.message = `Connection with Neo4j database failed`;
    this.stack = oldError.stack;
    this.details = oldError.message;
  }
}

export class Neo4j {
  private static connection: ConnectionWithDriver;
  private static config: Neo4jConfig;

  private constructor() {
    //
  }

  static async getConnection(): Promise<Connection> {
    if (!Neo4j.connection) {
      this.config = readMorpheusConfig();
      this.connection = new Connection(
        `${this.config.scheme}://${this.config.host}:${this.config.port}`,
        {
          username: this.config.username,
          password: this.config.password,
        },
      ) as ConnectionWithDriver;
      await Neo4j.connection.driver.verifyConnectivity();
      Neo4j.registerExitHook();
    }
    return Neo4j.connection;
  }

  private static registerExitHook() {
    process.on('exit', () => {
      if (this.connection) {
        this.connection.close().catch(console.error);
      }
    });
  }
}
