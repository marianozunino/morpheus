#!/usr/bin/env node
/* istanbul ignore file */
import { CommandFactory } from 'nest-commander';
import { AppModule } from './app.module';

async function bootstrap() {
  await CommandFactory.run(AppModule, {
    cliName: 'morpheus4j',
    logger: ['error', 'debug', 'verbose'],
  });
}

bootstrap().catch(console.error);
