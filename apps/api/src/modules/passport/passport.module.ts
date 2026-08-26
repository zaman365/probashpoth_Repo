import { Module } from '@nestjs/common';
import { EligibilityModule } from '../eligibility/eligibility.module';
import { SessionGuard } from '../../common/session.guard';
import { PassportController } from './passport.controller';
import { PassportService } from './passport.service';

@Module({
  imports: [EligibilityModule],
  controllers: [PassportController],
  providers: [PassportService, SessionGuard],
  exports: [PassportService],
})
export class PassportModule {}
