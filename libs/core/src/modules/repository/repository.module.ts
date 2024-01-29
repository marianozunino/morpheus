import { Module } from '@nestjs/common';
import { RepositoryService } from './repository.service';
import { ConfigurableModuleClass } from './repository.module-definition';

@Module({
  providers: [RepositoryService],
  exports: [RepositoryService],
})
export class RepositoryModule extends ConfigurableModuleClass {}
