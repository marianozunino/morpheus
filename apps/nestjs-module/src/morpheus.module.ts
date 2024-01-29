import { Module } from '@nestjs/common';
import { ConfigurableModuleClass } from './morpheus.module-definition';
import { MorpheusService } from './morpheus.service';
import { UtilsModule } from '@morpheus4j/core';

@Module({
  imports: [UtilsModule],
  providers: [MorpheusService],
  exports: [MorpheusService],
})
export class MorpheusModule extends ConfigurableModuleClass {}
