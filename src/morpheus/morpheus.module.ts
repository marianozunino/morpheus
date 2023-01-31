import { Module } from '@nestjs/common';
import { CliModule } from '../cli/cli.module';
import { ConfigurableModuleClass } from './morpheus.module-definition';
import { MorpheusService } from './morpheus.service';

@Module({
  imports: [CliModule],
  providers: [MorpheusService],
})
export class MorpheusModule extends ConfigurableModuleClass {}
