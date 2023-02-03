import { Module } from '@nestjs/common';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { MorpheusModule } from 'morpheus4j';
@Module({
  imports: [
    // Sync register
    MorpheusModule.register({
      scheme: 'bolt',
      host: 'localhost',
      port: 7687,
      username: 'neo4j',
      password: 'password',
      migrationsPath: './neo4j/migrations', // default value
    }),
    // Async register
    MorpheusModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        scheme: configService.get('MORPHEUS_SCHEME'),
        host: configService.get('MORPHEUS_HOST'),
        port: configService.get('MORPHEUS_PORT'),
        username: configService.get('MORPHEUS_USERNAME'),
        password: configService.get('MORPHEUS_PASSWORD'),
        migrationsPath: './neo4j/migrations', // default value
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
