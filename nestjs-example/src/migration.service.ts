import { MorpheusService } from '../../dist/nestjs';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Neo4jConfig, Neo4jScheme } from '../../dist/types';

@Injectable()
export class MigrationsService {
  constructor(
    private readonly morpheusService: MorpheusService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    // When no config is provided, the default config is used
    // -> morpheus.json
    // -> moprheus environment variables

    await this.morpheusService.cleanDatabase(); // NOTE: You probably don't want to do this, specially in production
    await this.morpheusService.runMigrations();

    // Use the ConfigService to access the environment variables
    const configs: Neo4jConfig[] = [
      {
        scheme: Neo4jScheme.BOLT,
        host: 'localhost',
        port: 7687,
        username: 'neo4j',
        password: 'password',
        migrationsPath: '../neo4j/migrations',
      },
    ];

    for (const config of configs) {
      // Clean and run migrations
      await this.morpheusService.cleanDatabase(config); // NOTE: You probably don't want to do this, specially in production
      await this.morpheusService.runMigrations(config);
    }
  }
}
