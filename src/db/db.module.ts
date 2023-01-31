import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { connectionProvider } from './neo4j';
import { Repository } from './repository';

@Module({
  imports: [ConfigModule],
  providers: [Repository, connectionProvider],
  exports: [Repository],
})
export class DbModule {}
