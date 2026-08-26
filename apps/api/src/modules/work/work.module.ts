import { Module } from '@nestjs/common';
import { SessionGuard } from '../../common/session.guard';
import { PassportModule } from '../passport/passport.module';
import { EligibilityModule } from '../eligibility/eligibility.module';
import { CatalogueModule } from '../catalogue/catalogue.module';
import { JobsModule } from '../jobs/jobs.module';
import { CasesModule } from '../cases/cases.module';
import { WorkController } from './work.controller';
import { WorkService } from './work.service';

@Module({
  imports: [PassportModule, EligibilityModule, CatalogueModule, JobsModule, CasesModule],
  controllers: [WorkController],
  providers: [WorkService, SessionGuard],
  exports: [WorkService],
})
export class WorkModule {}
