import { Module } from '@nestjs/common';
import { CliModule } from './cli/cli.module';

@Module({
  imports: [CliModule],
})
export class AppModule {}
