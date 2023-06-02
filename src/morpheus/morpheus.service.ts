import { Inject, Injectable, Optional } from '@nestjs/common';
import { MODULE_OPTIONS_TOKEN } from './morpheus.module-definition';
import { MorpheusModuleOptions } from './morpheus-module.options';
import { ConfigLoader, Neo4jConfig } from '../config/config-loader';
import { MigrationService } from '../cli/migration.service';
import { LazyModuleLoader } from '@nestjs/core';
import { FsService } from '../cli/fs.service';
import { Repository } from '../db/repository';
import { getDatabaseConnection } from '../db/neo4j';
import { LoggerService } from '../logger.service';

@Injectable()
export class MorpheusService {
  constructor(
    private readonly logger: LoggerService,
    private readonly lazyModuleLoader: LazyModuleLoader,
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

  private async executeMigrations(config: Neo4jConfig): Promise<void> {
    const { connection, migrationService } = await this.getDependencies(config);
    try {
      this.logger.debug('Executing migrations');
      await migrationService.migrate();
    } catch (error) {
      this.logger.error(error);
      throw error;
    } finally {
      this.logger.debug('Closing connection');
      await connection.close();
    }
  }

  private async getDependencies(config: Neo4jConfig) {
    const connection = await getDatabaseConnection(config);
    const fsService = new FsService(this.lazyModuleLoader, this.logger, config);
    const repository = new Repository(connection);

    const migrationService = new MigrationService(
      this.lazyModuleLoader,
      fsService,
      this.logger,
      repository,
    );
    return { config, fsService, connection, repository, migrationService };
  }

  public async runMigrationsFor(config: Neo4jConfig): Promise<void> {
    ConfigLoader.validateConfig(config);
    this.logger.debug(
      'Running migrations for config ' + JSON.stringify(config),
    );
    await this.executeMigrations(config);
  }
}
