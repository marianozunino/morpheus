import { registerAs } from '@nestjs/config';
import { DEFAULT_MIGRATIONS_PATH, ENV_CONFIG_TOKEN } from '../app.constants';
import { ConfigLoader, Neo4jConfig } from './config-loader';

export default registerAs(ENV_CONFIG_TOKEN, (): Neo4jConfig => {
  const config = ConfigLoader.getConfig();

  if (!config.migrationsPath) {
    config.migrationsPath = DEFAULT_MIGRATIONS_PATH;
  }
  return config;
});
