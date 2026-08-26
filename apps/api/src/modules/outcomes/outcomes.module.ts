import { Module } from '@nestjs/common';
import { SessionGuard } from '../../common/session.guard';
import {
  MyOutcomesController,
  OutcomesController,
  PublicOutcomesController,
} from './outcomes.controller';
import { OutcomesService } from './outcomes.service';

@Module({
  controllers: [OutcomesController, MyOutcomesController, PublicOutcomesController],
  providers: [OutcomesService, SessionGuard],
  exports: [OutcomesService],
})
export class OutcomesModule {}
