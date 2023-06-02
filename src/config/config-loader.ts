import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import Joi from 'joi';
import { DEFAULT_MIGRATIONS_PATH, MORPHEUS_FILE_NAME } from '../app.constants';

export enum Neo4jScheme {
  NEO4J = 'neo4j',
  NEO4J_S = 'neo4j+s',
  NEO4J_SSC = 'neo4j+ssc',
  BOLT = 'bolt',
  BOLT_S = 'bolt+s',
  BOLT_SSC = 'bolt+ssc',
}

export interface Neo4jConfig {
  database?: string;
  scheme: Neo4jScheme;
  host: string;
  port: number;
  username: string;
  password: string;
  /**
   * Path to the migrations folder
   * @default './neo4j/migrations'
   **/
  migrationsPath?: string;
}

export class ConfigLoader {
  public static getConfig() {
    if (this.isUsingEnv()) {
      return this.getConfigFromEnv();
    }
    return this.getConfigFromFile();
  }

  private static isUsingEnv(): boolean {
    return Object.keys(process.env).some(
      (key) => key.startsWith('NEO4J_') || key.startsWith('MORPHEUS_'),
    );
  }

  private static getConfigFromEnv(): Neo4jConfig {
    const config = {
      scheme: process.env.MORPHEUS_SCHEME as Neo4jConfig['scheme'],
      host: process.env.MORPHEUS_HOST,
      port: Number(process.env.MORPHEUS_PORT),
      username: process.env.MORPHEUS_USERNAME,
      password: process.env.MORPHEUS_PASSWORD,
      migrationsPath:
        process.env.MORPHEUS_MIGRATIONS_PATH ?? DEFAULT_MIGRATIONS_PATH,
    };
    this.validateConfig(config);
    return config;
  }

  public static getConfigFromFile(): Neo4jConfig {
    const configPath = resolve(process.cwd(), MORPHEUS_FILE_NAME);
    if (!existsSync(configPath)) {
      throw new Error(
        "Couldn't find a valid .morpheus.json file.\nIssue the following command to create one:\n> morpheus init",
      );
    }
    const config = readFileSync(configPath, 'utf8');

    try {
      const configAsJson = JSON.parse(config);
      this.validateConfig(configAsJson);
      configAsJson.migrationsPath =
        configAsJson.migrationsPath ?? DEFAULT_MIGRATIONS_PATH;
      return configAsJson;
    } catch (error) {
      throw new Error("Couldn't parse .morpheus.json file");
    }
  }

  public static validateConfig(config: Neo4jConfig): void {
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
}
