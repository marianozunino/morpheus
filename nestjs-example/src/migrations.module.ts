import { MorpheusModule } from 'morpheus4j';
import { Module } from '@nestjs/common';
import { MigrationsService } from './migrations.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [MorpheusModule, ConfigModule.forRoot()],
  providers: [MigrationsService],
})
export class MigrationsModule {}
