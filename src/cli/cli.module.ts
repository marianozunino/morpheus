import { Module } from '@nestjs/common';
import { FsService } from './fs.service';
import { MigrationService } from './migration.service';
import { CliService } from './cli.service';
import {
  CleanCommand,
  CreateCommand,
  InfoCommand,
  InitCommand,
  MigrateCommand,
} from './commands';
import { LoggerService } from '../logger.service';
import { ExecutionWrapperService } from './execution-wrapper.service';

@Module({
  providers: [
    InitCommand,
    InfoCommand,
    CreateCommand,
    MigrateCommand,
    CleanCommand,
    CliService,
    MigrationService,
    FsService,
    LoggerService,
    ExecutionWrapperService,
  ],
  exports: [CliService, LoggerService],
})
export class CliModule {}
