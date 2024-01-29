import { ConfigurableModuleBuilder } from '@nestjs/common';
import { MorpheusModuleOptions } from './morpheus-module.options';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<MorpheusModuleOptions>().build();
