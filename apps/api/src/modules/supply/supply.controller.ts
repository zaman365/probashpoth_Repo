import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Subject } from '@probash/auth';
import {
  createPartnerSubmissionSchema,
  declarePartnerFeeSchema,
  grantPartnerAccessSchema,
  updatePartnerPipelineSchema,
  type CreatePartnerSubmissionDto,
  type DeclarePartnerFeeDto,
  type GrantPartnerAccessDto,
  type UpdatePartnerPipelineDto,
} from '@probash/contracts';
import { CurrentSubject } from '../../common/current-subject.decorator';
import { SessionGuard } from '../../common/session.guard';
import { zodBody } from '../../common/zod.pipe';
import { SupplyService } from './supply.service';

@ApiTags('partner-portals')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('partner')
export class SupplyController {
  constructor(private readonly supply: SupplyService) {}

  @Get('dashboard')
  dashboard(@CurrentSubject() subject: Subject) {
    return this.supply.dashboard(subject);
  }

  @Get('submissions')
  submissions(@CurrentSubject() subject: Subject) {
    return this.supply.listSubmissions(subject);
  }

  @Post('submissions')
  createSubmission(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(createPartnerSubmissionSchema)) body: CreatePartnerSubmissionDto,
  ) {
    return this.supply.createSubmission(subject, body);
  }

  @Post('submissions/:id/submit')
  submit(@CurrentSubject() subject: Subject, @Param('id') id: string) {
    return this.supply.submitForReview(subject, id);
  }

  @Post('fees')
  fee(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(declarePartnerFeeSchema)) body: DeclarePartnerFeeDto,
  ) {
    return this.supply.declareFee(subject, body);
  }

  @Get('candidates')
  candidates(@CurrentSubject() subject: Subject) {
    return this.supply.candidates(subject);
  }

  @Post('applications/:id/actions')
  pipeline(
    @CurrentSubject() subject: Subject,
    @Param('id') id: string,
    @Body(zodBody(updatePartnerPipelineSchema)) body: UpdatePartnerPipelineDto,
  ) {
    return this.supply.updatePipeline(subject, id, body);
  }

  @Get('analytics')
  analytics(@CurrentSubject() subject: Subject) {
    return this.supply.analytics(subject);
  }
}

@ApiTags('partner-consent')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('me/partner-access')
export class PartnerAccessController {
  constructor(private readonly supply: SupplyService) {}

  @Get()
  list(@CurrentSubject() subject: Subject) {
    return this.supply.listAccess(subject);
  }

  @Post()
  grant(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(grantPartnerAccessSchema)) body: GrantPartnerAccessDto,
  ) {
    return this.supply.grantAccess(subject, body);
  }

  @Delete(':id')
  revoke(@CurrentSubject() subject: Subject, @Param('id') id: string) {
    return this.supply.revokeAccess(subject, id);
  }
}
