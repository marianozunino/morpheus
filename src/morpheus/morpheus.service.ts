import { Inject, Injectable, Optional } from '@nestjs/common';
import { MODULE_OPTIONS_TOKEN } from './morpheus.module-definition';
import { MorpheusModuleOptions } from './morpheus-module.options';
import { ConfigLoader, Neo4jConfig } from '../config/config-loader';
import { MigrationService } from '../cli/migration.service';
import { FsService } from '../cli/fs.service';
import { Repository } from '../db/repository';
import { getDatabaseConnection } from '../db/neo4j';
import { LoggerService } from '../logger.service';
import { Connection as CypherQBConnection } from 'cypher-query-builder';
import { Connection } from 'neo4j-driver-core';

@Injectable()
export class MorpheusService {
  constructor(
    private readonly logger: LoggerService,
    @Inject(MODULE_OPTIONS_TOKEN)
    @Optional()
    private readonly options?: MorpheusModuleOptions,
  ) {
    if (this.options) {
      ConfigLoader.validateConfig(this.options);
    }
  }

  private getConfig(): Neo4jConfig | undefined {
    if (!this.options) {
      try {
        return ConfigLoader.getConfig();
      } catch (error) {}
    }
    return this.options;
  }

  private async onModuleInit(): Promise<void> {
    const config = this.getConfig();
    if (!config) {
      this.logger.log(
        'No config provided, make sure to provide one either in the module options, environment variables or in the config file',
      );
      this.logger.log(
        'You can still run migrations manually by calling the runMigrationsFor method',
      );
      return;
    }
    await this.executeMigrations(config);
  }

  private async executeMigrations(
    config: Neo4jConfig,
    providedConnection?: Connection | CypherQBConnection,
  ): Promise<void> {
    const { migrationService, connection } = await this.getDependencies(
      config,
      providedConnection,
    );
    try {
      this.logger.debug('Executing migrations');
      await migrationService.migrate();
    } catch (error) {
      this.logger.error(error);
      throw error;
    } finally {
      if (!providedConnection) {
        this.logger.debug('Closing connection');
        await connection.close();
      }
    }
  }

  private async getDependencies(
    config: Neo4jConfig,
    connection?: Connection | CypherQBConnection,
  ) {
    if (!connection) {
      connection = await getDatabaseConnection(config);
    }

    const fsService = new FsService(this.logger, config);
    const repository = new Repository(connection as CypherQBConnection);

    const migrationService = new MigrationService(
      fsService,
      this.logger,
      repository,
    );
    return { config, fsService, connection, repository, migrationService };
  }

  public async runMigrationsFor(
    config: Neo4jConfig,
    providedConnection?: Connection | CypherQBConnection,
  ): Promise<void> {
    ConfigLoader.validateConfig(config);
    this.logger.debug(
      `Running migrations for ${config.host}:${config.port}${
        config.database ? `/${config.database}` : ''
      }`,
    );
    await this.executeMigrations(config, providedConnection);
  }

  /**
   * Cleans the selected schema database from every metadata created by this tool
   */
  public async cleanDatabase(
    config: Neo4jConfig & { cleanConfig?: { dropConstraints?: boolean } },
    providedConnection?: Connection | CypherQBConnection,
  ): Promise<void> {
    ConfigLoader.validateConfig(config);

    this.logger.debug(
      `Cleaning database ${config.host}:${config.port}${
        config.database ? `/${config.database}` : ''
      }`,
    );

    const { connection, repository } = await this.getDependencies(
      config,
      providedConnection,
    );

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
        await connection.close();
      }
    }
  }
}
