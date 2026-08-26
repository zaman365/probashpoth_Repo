import { Module } from '@nestjs/common';
import { SessionGuard } from '../../common/session.guard';
import { PassportModule } from '../passport/passport.module';
import { CatalogueModule } from '../catalogue/catalogue.module';
import { CasesModule } from '../cases/cases.module';
import { StudyController } from './study.controller';
import { StudyService } from './study.service';

@Module({
  imports: [PassportModule, CatalogueModule, CasesModule],
  controllers: [StudyController],
  providers: [StudyService, SessionGuard],
  exports: [StudyService],
})
export class StudyModule {}
