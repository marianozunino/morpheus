import { Connection } from 'cypher-query-builder';
import { ConfigLoader, Neo4jConfig } from '../config/config-loader';
import { CONNECTION_TOKEN } from '../app.constants';
import { Provider } from '@nestjs/common';

export const getDatabaseConnection = async (
  dbConfig: Neo4jConfig = ConfigLoader.getConfig(),
) => {
  const connectionUrl = `${dbConfig.scheme}://${dbConfig.host}:${dbConfig.port}`;
  const connection = new Connection(connectionUrl, {
    username: dbConfig.username,
    password: dbConfig.password,
  });

  if (dbConfig.database) {
    connection.session = function () {
      if (this.open) {
        return this.driver.session({ database: dbConfig.database });
      }
      return null;
    };
  }

  await connection.query().raw('RETURN 1').run();
  return connection;
};

export const connectionProvider: Provider = {
  provide: CONNECTION_TOKEN,
  useFactory: getDatabaseConnection,
};
