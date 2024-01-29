import { Module } from '@nestjs/common';
import { ExecutionWrapperService } from './execution-wrapper.service';
import { InfoCommand } from './info.command';
import { InitCommand } from './init.command';
import { UtilsModule } from '@morpheus4j/core';
import { CreateCommand } from './create.command';
import { MigrateCommand } from './migrate.command';
import { ValidateCommand } from './validate.command';
import { CleanCommand } from './clean.command';

@Module({
  providers: [InitCommand, InfoCommand, CreateCommand, MigrateCommand, ValidateCommand, CleanCommand, ExecutionWrapperService],
  imports: [UtilsModule],
})
export class CommandModule {}
