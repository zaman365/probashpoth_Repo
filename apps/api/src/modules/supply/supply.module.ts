import { Module } from '@nestjs/common';
import { SessionGuard } from '../../common/session.guard';
import { SupplyController, PartnerAccessController } from './supply.controller';
import { SupplyService } from './supply.service';

@Module({
  controllers: [SupplyController, PartnerAccessController],
  providers: [SupplyService, SessionGuard],
  exports: [SupplyService],
})
export class SupplyModule {}
