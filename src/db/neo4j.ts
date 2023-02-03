import { Provider } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Connection } from 'cypher-query-builder';
import { CONNECTION_TOKEN, GLOBAL_CONFIG_TOKEN } from '../app.constants';
import config from '../config/env.config';

export const connectionProvider: Provider = {
  provide: CONNECTION_TOKEN,
  useFactory: async (dbConfig?: ConfigType<typeof config>) => {
    const connection = new Connection(
      `${dbConfig.scheme}://${dbConfig.host}:${dbConfig.port}`,
      {
        username: dbConfig.username,
        password: dbConfig.password,
      },
    );
    await connection.query().raw('RETURN 1').run();
    return connection;
  },
  inject: [GLOBAL_CONFIG_TOKEN],
};
