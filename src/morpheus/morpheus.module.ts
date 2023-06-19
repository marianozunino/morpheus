import { Module } from '@nestjs/common';
import { ConfigurableModuleClass } from './morpheus.module-definition';
import { MorpheusService } from './morpheus.service';
import { LoggerService } from '../logger.service';
import { LazyModuleLoader } from '@nestjs/core';

@Module({
  providers: [MorpheusService, LoggerService, LazyModuleLoader],
  exports: [MorpheusService],
})
export class MorpheusModule extends ConfigurableModuleClass {}
