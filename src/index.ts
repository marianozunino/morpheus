#!/usr/bin/env node
/* istanbul ignore file */
import { Command } from 'commander';
import { Info } from './info';
import { Migrator } from './migrator';
import { Neo4j } from './neo4j';
import {
  generateMigration,
  createMorpheusFile,
  repositoryFactory,
  asyncExecutionWrapper,
  executionWrapper,
} from './utils';

export { Migrator, Neo4j, repositoryFactory };

const program = new Command();

program
  .name('string-util')
  .description('CLI to some JavaScript string utilities');

program
  .command('init')
  .description('create a morpheus file')
  .action(() => {
    executionWrapper(createMorpheusFile);
  });

program
  .command('info')
  .description('show current status')
  .action(() => {
    void asyncExecutionWrapper(async () => {
      const repository = await repositoryFactory();
      await new Info(repository).getInfo();
    });
  });

program
  .command('create')
  .description('creates a new migration file')
  .argument('<string>', 'migration base name')
  .action((fileName: string) => {
    void asyncExecutionWrapper(async () => generateMigration(fileName));
  });

program
  .command('migrate')
  .description('executes migrations')
  .action(() => {
    void asyncExecutionWrapper(async () => {
      const repository = await repositoryFactory();
      try {
        await new Migrator(repository).migrate();
      } catch (error) {
        console.error(error.message);
        process.exit(1);
      }
    });
  });

program.parse();

process.on('exit', () => {
  Neo4j.close().catch(console.error);
});
