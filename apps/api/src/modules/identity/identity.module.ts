import { Module } from '@nestjs/common';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
import { SessionGuard } from '../../common/session.guard';

@Module({
  controllers: [IdentityController],
  providers: [IdentityService, SessionGuard],
  exports: [IdentityService],
})
export class IdentityModule {}
