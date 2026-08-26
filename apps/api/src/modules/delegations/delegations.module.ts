import { Module } from '@nestjs/common';
import { DelegationsController } from './delegations.controller';
import { DelegationsService } from './delegations.service';
import { SessionGuard } from '../../common/session.guard';

@Module({
  controllers: [DelegationsController],
  providers: [DelegationsService, SessionGuard],
  exports: [DelegationsService],
})
export class DelegationsModule {}
