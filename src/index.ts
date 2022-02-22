#!/usr/bin/env node
/* istanbul ignore file */
import { Command } from 'commander';
import { Migrator } from './migrator';
import { Neo4j } from './neo4j';
import {
  generateMigration,
  createMigrationsFolder,
  createMorpheusFile,
  repositoryFactory,
  asyncExecutionWrapper,
  executionWrapper,
} from './utils';

const program = new Command();

program
  .name('string-util')
  .description('CLI to some JavaScript string utilities');

program
  .command('init')
  .description('create a morpheus file')
  .action(() => {
    executionWrapper(createMigrationsFolder, createMorpheusFile);
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
      await new Migrator(repository).migrate();
    });
  });

program.parse();

process.on('exit', () => {
  Neo4j.close().catch(console.error);
});
