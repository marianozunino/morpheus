import { Connection } from 'cypher-query-builder';
import { Driver } from 'neo4j-driver-core/types';
import { Config } from './config';

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
  migrationsPath?: string;
}

type ConnectionWithDriver = Connection & { driver: Driver };

export class Neo4j {
  private static connection: ConnectionWithDriver;
  private static config: Neo4jConfig;

  /* istanbul ignore next */
  private constructor() {
    //
  }

  static async getConnection(): Promise<Connection> {
    if (!Neo4j.connection) {
      this.config = Config.getConfig();
      this.connection = new Connection(
        `${this.config.scheme}://${this.config.host}:${this.config.port}`,
        {
          username: this.config.username,
          password: this.config.password,
        },
      ) as ConnectionWithDriver;
      await Neo4j.connection.driver.verifyConnectivity();
    }
    return Neo4j.connection;
  }

  public static async close() {
    if (this.connection) {
      await this.connection.close();
      this.connection = undefined;
    }
  }
}
