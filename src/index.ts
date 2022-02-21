#!/usr/bin/env node
/* istanbul ignore file */
import { Command } from 'commander';
import { Migrator } from './migrator';
import {
  generateMigration,
  createMigrationsFolder,
  createMorpheusFile,
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
    void asyncExecutionWrapper(async () => await new Migrator().migrate());
  });

program.parse();

async function asyncExecutionWrapper(
  ...executables: (() => Promise<unknown>)[]
): Promise<void> {
  try {
    for (const executable of executables) {
      await executable();
    }
  } catch (error) {
    console.error(error.message);
  } finally {
    process.exit(0);
  }
}

function executionWrapper(...executables: CallableFunction[]): void {
  try {
    executables.forEach((executable) => executable());
  } catch (error) {
    console.error(error.message);
  } finally {
    process.exit(0);
  }
}
