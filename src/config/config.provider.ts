import { ConfigType } from '@nestjs/config';
import envConfig from './env.config';
import { MorpheusModuleOptions } from '../morpheus/morpheus-module.options';
import { DEFAULT_MIGRATIONS_PATH, GLOBAL_CONFIG_TOKEN } from '../app.constants';
import { MODULE_OPTIONS_TOKEN } from '../morpheus/morpheus.module-definition';

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
