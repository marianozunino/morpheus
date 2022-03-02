import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { Neo4jConfig } from './neo4j';
import Joi from 'joi';
import assert from 'assert';
import { DEFAULT_MIGRATIONS_PATH, MORPHEUS_FILE_NAME } from './types';

function getConfigFromEnv(): Neo4jConfig {
  console.log('Getting config from env');
  const config = {
    scheme:
      (process.env.NEO4J_SCHEME as Neo4jConfig['scheme']) ||
      (process.env.MORPHEUS_SCHEME as Neo4jConfig['scheme']),
    host: process.env.NEO4J_HOST || process.env.MORPHEUS_HOST,
    port: Number(process.env.NEO4J_PORT) || Number(process.env.MORPHEUS_PORT),
    username: process.env.NEO4J_USERNAME || process.env.MORPHEUS_USERNAME,
    password: process.env.NEO4J_PASSWORD || process.env.MORPHEUS_PASSWORD,
    migrationsPath: process.env.MORPHEUS_MIGRATIONS_PATH,
  };
  return config;
}

function getConfigFromFile(): Neo4jConfig {
  console.log('Getting config from file');
  const configPath = resolve(process.cwd(), MORPHEUS_FILE_NAME);
  assert(existsSync(configPath), "Couldn't find a valid .morpheus.json file");
  const config = readFileSync(configPath, 'utf8');

  try {
    const configAsJson = JSON.parse(config);
    return configAsJson;
  } catch (error) {
    throw new Error("Couldn't parse .morpheus.json file");
  }
}

function isUsingEnv(): boolean {
  return Object.keys(process.env).some(
    (key) => key.startsWith('NEO4J_') || key.startsWith('MORPHEUS_'),
  );
}

function validateConfig(config: Neo4jConfig): void {
  const validationResult = Joi.object({
    scheme: Joi.string()
      .valid('neo4j', 'neo4j+s', 'neo4j+ssc', 'bolt', 'bolt+s', 'bolt+ssc')
      .required(),
    host: Joi.string().required(),
    port: Joi.number().required(),
    username: Joi.string().required(),
    password: Joi.string().required(),
    migrationsPath: Joi.string().optional(),
  }).validate(config);
  if (validationResult.error?.details?.length > 0) {
    validationResult.error.details.forEach((detail) => {
      console.error(detail.message);
    });
    throw new Error('Invalid config');
  }
}

function readMorpheusConfig(): Neo4jConfig {
  const config = isUsingEnv() ? getConfigFromEnv() : getConfigFromFile();
  validateConfig(config);
  if (!config.migrationsPath) {
    config.migrationsPath = DEFAULT_MIGRATIONS_PATH;
  }
  return config;
}

export class Config {
  private static config: Neo4jConfig;

  static setConfig(connectionOptions: Neo4jConfig): void {
    this.config = connectionOptions;
  }

  static getConfig(): Neo4jConfig {
    if (!Config.config) {
      Config.config = readMorpheusConfig();
    }
    return Config.config;
  }
}
