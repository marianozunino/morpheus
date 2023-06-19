import { ConfigType } from '@nestjs/config';
import envConfig from './env.config';
import { DEFAULT_MIGRATIONS_PATH, GLOBAL_CONFIG_TOKEN } from '../app.constants';

export const configProvider = {
  provide: GLOBAL_CONFIG_TOKEN,
  useFactory: async (dbConfig: ConfigType<typeof envConfig>) => {
    if (!dbConfig.migrationsPath) {
      dbConfig.migrationsPath = DEFAULT_MIGRATIONS_PATH;
    }
    return dbConfig;
  },
  inject: [{ token: envConfig.KEY, optional: true }],
};
