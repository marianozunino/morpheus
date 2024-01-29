import { Module } from '@nestjs/common';
import { CliService } from './cli.service';
import { UtilsModule } from '../utils/utils.module';
import { RepositoryModule, getDatabaseConnection } from '../repository';
import { ConfigService } from '../utils';
import { MigrationService } from './migration.service';

@Module({
  imports: [
    UtilsModule,
    RepositoryModule.registerAsync({
      useFactory: () => {
        const cfg = ConfigService.getNeo4jConfig();
        return getDatabaseConnection(cfg);
      },
    }),
  ],

  exports: [CliService, MigrationService],
  providers: [CliService, MigrationService],
})
export class CliModule {}
