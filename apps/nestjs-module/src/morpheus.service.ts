import { Inject, Injectable, Optional } from '@nestjs/common';
import { MODULE_OPTIONS_TOKEN } from './morpheus.module-definition';
import { Connection } from 'cypher-query-builder';

import {
  Neo4jConfig,
  getDatabaseConnection,
  ConfigService,
  Logger,
  RepositoryService,
  FsService,
  MigrationService,
} from '@morpheus4j/core';

@Injectable()
export class MorpheusService {
  private readonly logger = new Logger(MorpheusService.name);

  constructor(
    private readonly fsService: FsService,
    @Inject(MODULE_OPTIONS_TOKEN)
    @Optional()
    private readonly options?: Neo4jConfig,
  ) {
    if (this.options) {
      ConfigService.validateConfig(this.options);
    }
  }

  private getConfig(): Neo4jConfig | undefined {
    if (!this.options) {
      try {
        return ConfigService.loadConfig();
      } catch (error) {}
    }
    return this.options;
  }

  public async onModuleInit(): Promise<void> {
    const config = this.getConfig();
    if (!config) {
      this.logger.log(
        'No config provided, make sure to provide one either in the module options, environment variables or in the config file',
      );
      this.logger.log('You can still run migrations manually by calling the runMigrationsFor method');
      return;
    }
    await this.executeMigrations(config);
  }

  private async executeMigrations(config: Neo4jConfig, providedConnection?: Connection): Promise<void> {
    const repository = await this.getRepository(config, providedConnection);
    const migrationService = this.getMigrationService(repository);

    try {
      this.logger.debug('Executing migrations');
      await migrationService.migrate();
    } catch (error) {
      this.logger.error(error);
      throw error;
    } finally {
      if (!providedConnection) {
        this.logger.debug('Closing connection');
        await repository.close();
      }
    }
  }

  public async runMigrationsFor(config: Neo4jConfig, providedConnection?: Connection): Promise<void> {
    ConfigService.validateConfig(config);
    this.logger.debug(`Running migrations for ${config.host}:${config.port}${config.database ? `/${config.database}` : ''}`);
    await this.executeMigrations(config, providedConnection);
  }

  /**
   * Cleans the selected schema database from every metadata created by this tool
   */
  public async cleanDatabase(
    config: Neo4jConfig & { cleanConfig?: { dropConstraints?: boolean } },
    providedConnection?: Connection,
  ): Promise<void> {
    ConfigService.validateConfig(config);

    this.logger.debug(`Cleaning database ${config.host}:${config.port}${config.database ? `/${config.database}` : ''}`);

    const repository = await this.getRepository(config, providedConnection);

    try {
      const { dropConstraints } = config?.cleanConfig || {
        dropConstraints: true,
      };

      this.logger.debug('Dropping chain');
      await repository.dropChain();
      if (dropConstraints) {
        this.logger.debug('Dropping constraints');
        await repository.dropConstraints();
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    } finally {
      if (!providedConnection) {
        this.logger.debug('Closing connection');
        await repository.close();
      }
    }
  }

  private async getRepository(config: Neo4jConfig, connection?: Connection): Promise<RepositoryService> {
    let providedConnection = connection;

    if (!connection) {
      providedConnection = await getDatabaseConnection(config);
    }

    const repository = new RepositoryService(providedConnection);
    return repository;
  }

  private getMigrationService(repository: RepositoryService): MigrationService {
    const migrationService = new MigrationService(this.fsService, repository);

    return migrationService;
  }
}
