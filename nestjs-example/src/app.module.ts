import { Module } from '@nestjs/common';
import { MorpheusModule, Neo4jScheme } from '../../../dist/morpheus/index';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MigrationsModule } from './migrations.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    /**
     * MorpheusModule will try to pickup the configuration from the environment variables or from the .morpheus.json
     * If no configuration is found, it will yield an error message.
     */
    MorpheusModule,

    /**
     * You can also register the module with a configuration object, syncronously or asyncronously
     * This will make the module ignore the environment variables and the .morpheus.json file
     */
    MorpheusModule.register({
      scheme: Neo4jScheme.NEO4J,
      host: 'localhost',
      port: 7474,
      username: 'neo4j',
      password: 'neo4j',
      database: 'neo4j',
      migrationsPath: './neo4j/migrations', // default value
    }),
    MorpheusModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        scheme: configService.get('MORPHEUS_SCHEME'),
        host: configService.get('MORPHEUS_HOST'),
        port: configService.get('MORPHEUS_PORT'),
        username: configService.get('MORPHEUS_USERNAME'),
        password: configService.get('MORPHEUS_PASSWORD'),
        database: configService.get('MORPHEUS_DATABASE'),
        migrationsPath: './neo4j/migrations', // default value
      }),
      inject: [ConfigService],
    }),

    /**
     * You can create your own module which imports MorpheusModule and uses the MorpheusService
     */
    MigrationsModule,
  ],
})
export class AppModule {}
