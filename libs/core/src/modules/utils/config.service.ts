import { writeFileSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import { MorpheusConfig, Neo4jConfig, Neo4jScheme, InitOptions, MORPHEUS_FILE_NAME, DEFAULT_MIGRATIONS_PATH } from '../..';

import Joi from 'joi';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  constructor() {}

  public static getConfig(): Neo4jConfig {
    if (this.isUsingEnv()) {
      return this.getConfigFromEnv();
    }
    return this.getConfigFromFile();
  }

  private static isUsingEnv(): boolean {
    return Object.keys(process.env).some((key) => key.startsWith('NEO4J_') || key.startsWith('MORPHEUS_'));
  }

  private static getConfigFromEnv(): Neo4jConfig {
    const config = {
      scheme: process.env.MORPHEUS_SCHEME as Neo4jConfig['scheme'],
      host: process.env.MORPHEUS_HOST,
      port: Number(process.env.MORPHEUS_PORT),
      username: process.env.MORPHEUS_USERNAME,
      password: process.env.MORPHEUS_PASSWORD,
      database: process.env.MORPHEUS_DATABASE,
      migrationsPath: process.env.MORPHEUS_MIGRATIONS_PATH,
    };
    this.validateConfig(config);
    return config;
  }

  public static getConfigFromFile(): Neo4jConfig {
    const configPath = resolve(process.cwd(), MORPHEUS_FILE_NAME);
    if (!existsSync(configPath)) {
      console.error("Couldn't find a valid .morpheus.json file.\nCreating a new one...");

      this.writeConfigFile();
    }
    const config = readFileSync(configPath, 'utf8');

    try {
      const configAsJson = JSON.parse(config);
      this.validateConfig(configAsJson);
      return configAsJson;
    } catch (error) {
      console.error(error);
      throw new Error("Couldn't parse .morpheus.json file");
    }
  }

  public static validateConfig(config: MorpheusConfig): void {
    const validationResult = Joi.object({
      scheme: Joi.string().valid('neo4j', 'neo4j+s', 'neo4j+ssc', 'bolt', 'bolt+s', 'bolt+ssc').required(),
      host: Joi.string().required(),
      port: Joi.number().required(),
      username: Joi.string().required(),
      password: Joi.string().required(),
      migrationsPath: Joi.string().optional(),
      database: Joi.string().optional(),
    }).validate(config, { allowUnknown: true });

    // apply default migrations path
    if (!config.migrationsPath) {
      // eslint-disable-next-line no-param-reassign
      config.migrationsPath = DEFAULT_MIGRATIONS_PATH;
    }

    if (validationResult.error?.details?.length > 0) {
      validationResult.error.details.forEach((detail) => {
        console.error(detail.message);
      });
      throw new Error('Invalid config');
    }
  }

  public static getMigrationsPath(): string {
    const config = this.getConfig();

    return config.migrationsPath;
  }

  public static getNeo4jConfig(): Neo4jConfig {
    const config = this.getConfig();
    return {
      scheme: config.scheme,
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      database: config.database,
    };
  }

  public static getMorpheusConfig(): MorpheusConfig {
    return this.getConfig();
  }

  public static createMorpheusFile(options: InitOptions): void {
    if (options.force) {
      this.writeConfigFile();
    } else {
      if (existsSync(MORPHEUS_FILE_NAME)) {
        throw new Error(`Morpheus file already exists: ${MORPHEUS_FILE_NAME}`);
      }
      this.writeConfigFile();
    }
  }

  private static writeConfigFile(): void {
    const defaultConfig: Neo4jConfig = {
      host: 'localhost',
      port: 7687,
      username: 'neo4j',
      password: 'neo4j',
      scheme: Neo4jScheme.NEO4J,
      migrationsPath: DEFAULT_MIGRATIONS_PATH,
      database: 'neo4j',
    };
    writeFileSync(MORPHEUS_FILE_NAME, JSON.stringify(defaultConfig, null, 2));
  }
}
