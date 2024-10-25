import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MigrationsModule } from './migration.module';

@Module({
  imports: [ConfigModule.forRoot(), MigrationsModule],
})
export class AppModule {}
