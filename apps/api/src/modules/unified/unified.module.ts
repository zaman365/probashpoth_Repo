import { Module } from '@nestjs/common';
import { SessionGuard } from '../../common/session.guard';
import { CatalogueModule } from '../catalogue/catalogue.module';
import { EligibilityModule } from '../eligibility/eligibility.module';
import { UnifiedApplicantController, UnifiedPublicController } from './unified.controller';
import { UnifiedMobilityService } from './unified.service';

@Module({
  imports: [CatalogueModule, EligibilityModule],
  controllers: [UnifiedPublicController, UnifiedApplicantController],
  providers: [UnifiedMobilityService, SessionGuard],
  exports: [UnifiedMobilityService],
})
export class UnifiedMobilityModule {}
