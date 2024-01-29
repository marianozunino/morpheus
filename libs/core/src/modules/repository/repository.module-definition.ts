import { ConfigurableModuleBuilder } from '@nestjs/common';
import { RepositoryModuleOptions } from './repository-module.options';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<RepositoryModuleOptions>().build();
