import { MorpheusService } from 'morpheus4j';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MigrationsService {
  constructor(
    private readonly morpheusService: MorpheusService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const configs = [
      {
        scheme: this.configService.get('DB1_SCHEME'),
        host: this.configService.get('DB1_HOST'),
        port: this.configService.get('DB1_PORT'),
        username: this.configService.get('DB1_USERNAME'),
        password: this.configService.get('DB1_PASSWORD'),
        migrationsPath: this.configService.get('DB1_MIGRATIONS_PATH'),
      },
      {
        scheme: this.configService.get('DB2_SCHEME'),
        host: this.configService.get('DB2_HOST'),
        port: this.configService.get('DB2_PORT'),
        username: this.configService.get('DB2_USERNAME'),
        password: this.configService.get('DB2_PASSWORD'),
        migrationsPath: this.configService.get('DB2_MIGRATIONS_PATH'),
      },
    ];

    for (const config of configs) {
      await this.morpheusService.runMigrationsFor(config);
    }
    // OR
    await Promise.all(
      configs.map((config) => this.morpheusService.runMigrationsFor(config)),
    );
  }
}
