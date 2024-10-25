import { MorpheusModule } from '../../dist/nestjs';
import { Module } from '@nestjs/common';
import { MigrationsService } from './migration.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [MorpheusModule, ConfigModule.forRoot()],
  providers: [MigrationsService],
})
export class MigrationsModule {}
