import { Module } from '@nestjs/common';
import { EligibilityController } from './eligibility.controller';
import { EligibilityService } from './eligibility.service';
import { CatalogueModule } from '../catalogue/catalogue.module';
import { SessionGuard } from '../../common/session.guard';

@Module({
  imports: [CatalogueModule],
  controllers: [EligibilityController],
  providers: [EligibilityService, SessionGuard],
  exports: [EligibilityService],
})
export class EligibilityModule {}
