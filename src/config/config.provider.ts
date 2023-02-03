import { ConfigType } from '@nestjs/config';
import envConfig from './env.config';
import { MorpheusModuleOptions } from '../morpheus/morpheus-module.options';
import { GLOBAL_CONFIG_TOKEN } from '../app.constants';
import { MODULE_OPTIONS_TOKEN } from '../morpheus/morpheus.module-definition';

export const configProvider = {
  provide: GLOBAL_CONFIG_TOKEN,
  useFactory: async (
    dbConfig?: ConfigType<typeof envConfig>,
    options?: MorpheusModuleOptions,
  ) => {
    if (!dbConfig && !options) {
      throw new Error('No configuration provided');
    }
    if (!dbConfig) {
      dbConfig = options;
    }
    return dbConfig;
  },
  inject: [
    { token: envConfig.KEY, optional: true },
    { token: MODULE_OPTIONS_TOKEN, optional: true },
  ],
};
