import { Module } from '@nestjs/common';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { CostsModule } from '../costs/costs.module';
import { SessionGuard } from '../../common/session.guard';

@Module({
  imports: [CostsModule],
  controllers: [CasesController],
  providers: [CasesService, SessionGuard],
  exports: [CasesService, CostsModule],
})
export class CasesModule {}
