import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { SessionGuard } from '../../common/session.guard';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, SessionGuard],
  exports: [DocumentsService],
})
export class DocumentsModule {}
