import { Module } from '@nestjs/common';
import { SessionGuard } from '../../common/session.guard';
import { CatalogueModule } from '../catalogue/catalogue.module';
import { OperationsController, ServiceDirectoryController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({
  imports: [CatalogueModule],
  controllers: [OperationsController, ServiceDirectoryController],
  providers: [OperationsService, SessionGuard],
  exports: [OperationsService],
})
export class OperationsModule {}
