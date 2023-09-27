import { Connection } from 'cypher-query-builder';
import { ConfigLoader, Neo4jConfig } from '../config/config-loader';
import { CONNECTION_TOKEN } from '../app.constants';
import { Provider } from '@nestjs/common';

export const getDatabaseConnection = async (
  dbConfig: Neo4jConfig = ConfigLoader.getConfig(),
) => {
  let connectionUrl = `${dbConfig.scheme}://${dbConfig.host}:${dbConfig.port}`;

  if (dbConfig.database) {
    connectionUrl = `${connectionUrl}/${dbConfig.database}`;
  }

  const connection = new Connection(connectionUrl, {
    username: dbConfig.username,
    password: dbConfig.password,
  });

  await connection.query().raw('RETURN 1').run();
  return connection;
};

export const connectionProvider: Provider = {
  provide: CONNECTION_TOKEN,
  useFactory: getDatabaseConnection,
};
