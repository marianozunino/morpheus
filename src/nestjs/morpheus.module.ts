import {Module} from '@nestjs/common'

import {MorpheusService} from './morpheus.service'

@Module({
  exports: [MorpheusService],
  providers: [MorpheusService],
})
export class MorpheusModule {}
