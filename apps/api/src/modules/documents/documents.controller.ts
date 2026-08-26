import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import {
  uploadDocumentSchema,
  type DocumentSummaryDto,
  type UploadDocumentDto,
} from '@probash/contracts';
import type { Subject } from '@probash/auth';
import { zodBody } from '../../common/zod.pipe';
import { SessionGuard } from '../../common/session.guard';
import { CurrentSubject } from '../../common/current-subject.decorator';
import { DocumentsService } from './documents.service';

const shareSchema = z.object({
  organizationId: z.string().min(1),
  purpose: z.object({ bn: z.string().min(1), en: z.string().min(1) }),
  days: z.number().int().min(1).max(90),
});

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('me/documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  async list(@CurrentSubject() subject: Subject): Promise<DocumentSummaryDto[]> {
    return this.documents.list(subject);
  }

  @Post()
  async upload(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(uploadDocumentSchema)) dto: UploadDocumentDto,
  ): Promise<DocumentSummaryDto> {
    return this.documents.upload(subject, dto);
  }

  @Post(':id/shares')
  async share(
    @CurrentSubject() subject: Subject,
    @Param('id') id: string,
    @Body(zodBody(shareSchema)) body: z.infer<typeof shareSchema>,
  ) {
    return this.documents.share(subject, id, body);
  }

  @Delete('shares/:shareId')
  async revoke(@CurrentSubject() subject: Subject, @Param('shareId') shareId: string) {
    return this.documents.revokeShare(subject, shareId);
  }
}
