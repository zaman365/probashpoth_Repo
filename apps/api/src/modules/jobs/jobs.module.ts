import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { QrService } from './qr.service';
import { CatalogueModule } from '../catalogue/catalogue.module';

@Module({
  imports: [CatalogueModule],
  controllers: [JobsController],
  providers: [JobsService, QrService],
  exports: [JobsService, QrService],
})
export class JobsModule {}
