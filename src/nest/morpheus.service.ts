import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Connection } from 'cypher-query-builder';
import { Driver } from 'neo4j-driver-core/types';
import { Config } from '../config';
import { Migrator } from '../migrator';
import { Repository } from '../repository';
import { MorpheusModuleOptions } from './morpheus-service-options';
import { createMigrationsFolder } from '../utils';
import { DEFAULT_MIGRATIONS_PATH } from '../types';

type ConnectionWithDriver = Connection & { driver: Driver };

@Injectable()
export class MorpheusService implements OnModuleInit {
  private connection: ConnectionWithDriver;
  private readonly logger = new Logger(MorpheusService.name);

  constructor(private readonly connectionOptions: MorpheusModuleOptions) {
    connectionOptions.migrationsPath =
      connectionOptions.migrationsPath || DEFAULT_MIGRATIONS_PATH;
  }

  async onModuleInit(): Promise<void> {
    try {
      Config.setConfig(this.connectionOptions);

      await this.stablishConnection();
      createMigrationsFolder();
      this.logger.log('Executing migrations');
      const repository = new Repository(this.connection);
      await new Migrator(repository).migrate();
      this.logger.log('Migration complete');
    } catch (error) {
      this.logger.error(error);
      throw error;
    } finally {
      if (this.connection) {
        this.logger.debug('Closing connection');
        await this.connection.close();
        this.logger.debug('Connection closed');
      }
    }
  }

  private async stablishConnection(): Promise<void> {
    this.connection = new Connection(
      `${this.connectionOptions.scheme}://${this.connectionOptions.host}:${this.connectionOptions.port}`,
      {
        username: this.connectionOptions.username,
        password: this.connectionOptions.password,
      },
    ) as ConnectionWithDriver;
    await this.connection.driver.verifyConnectivity();
  }
}
