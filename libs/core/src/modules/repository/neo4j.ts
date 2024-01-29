import { Neo4jConfig } from '../..';
import { Connection } from 'cypher-query-builder';

export const getDatabaseConnection = async (dbConfig: Neo4jConfig): Promise<Connection> => {
  const connectionUrl = `${dbConfig.scheme}://${dbConfig.host}:${dbConfig.port}`;
  const connection = new Connection(connectionUrl, {
    username: dbConfig.username,
    password: dbConfig.password,
  });

  if (dbConfig.database) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connection.session = function (): any {
      if (this.open) {
        return this.driver.session({ database: dbConfig.database });
      }
      return null;
    };
  }

  await connection.query().raw('RETURN 1').run();
  return connection;
};
