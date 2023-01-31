import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { configProvider } from './config.provider';
import databaseConfig from './env.config';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [databaseConfig],
    }),
  ],
  providers: [configProvider],
  exports: [configProvider],
})
export class ConfigModule {}
