import { Module } from '@nestjs/common';

import { FsService } from './fs.service';
import { ConfigService } from './config.service';

@Module({
  providers: [FsService, ConfigService],
  exports: [FsService, ConfigService],
})
export class UtilsModule {}
