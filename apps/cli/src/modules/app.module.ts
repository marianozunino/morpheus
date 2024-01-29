import { Module } from '@nestjs/common';
import { CommandModule } from './command';

@Module({
  imports: [CommandModule],
})
export class AppModule {}
