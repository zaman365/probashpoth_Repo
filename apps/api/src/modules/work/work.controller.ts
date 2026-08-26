import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Subject } from '@probash/auth';
import {
  createWorkApplicationSchema,
  decideWorkOfferSchema,
  recordWorkOutcomeSchema,
  workDiscoveryQuerySchema,
  type CreateWorkApplicationDto,
  type DecideWorkOfferDto,
  type RecordWorkOutcomeDto,
  type WorkCvDto,
} from '@probash/contracts';
import { CurrentSubject } from '../../common/current-subject.decorator';
import { SessionGuard } from '../../common/session.guard';
import { zodBody } from '../../common/zod.pipe';
import { WorkService } from './work.service';

@ApiTags('work-os')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('work')
export class WorkController {
  constructor(private readonly work: WorkService) {}

  @Get('discover')
  async discover(
    @CurrentSubject() subject: Subject,
    @Query('mode') mode?: string,
    @Query('occupation') occupationKey?: string,
    @Query('country') countryCode?: string,
  ) {
    return this.work.discover(
      subject.userId,
      workDiscoveryQuerySchema.parse({
        mode,
        occupationKey,
        countryCode: countryCode?.toUpperCase(),
      }),
    );
  }

  @Get('cv')
  async cv(@CurrentSubject() subject: Subject, @Query('format') format?: WorkCvDto['format']) {
    return this.work.generateCv(subject.userId, format);
  }

  @Get('dashboard')
  async dashboard(@CurrentSubject() subject: Subject) {
    return this.work.dashboard(subject);
  }

  @Get('applications')
  async applications(@CurrentSubject() subject: Subject) {
    return this.work.listApplications(subject.userId);
  }

  @Post('applications')
  async apply(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(createWorkApplicationSchema)) body: CreateWorkApplicationDto,
  ) {
    return this.work.createApplication(subject, body);
  }

  @Get('applications/:id/offer-review')
  async review(@CurrentSubject() subject: Subject, @Param('id') id: string) {
    return this.work.offerReview(subject, id);
  }

  @Post('applications/:id/decision')
  async decide(
    @CurrentSubject() subject: Subject,
    @Param('id') id: string,
    @Body(zodBody(decideWorkOfferSchema)) body: DecideWorkOfferDto,
  ) {
    return this.work.decideOffer(subject, id, body);
  }

  @Post('outcomes')
  async outcome(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(recordWorkOutcomeSchema)) body: RecordWorkOutcomeDto,
  ) {
    return this.work.recordOutcome(subject.userId, body);
  }
}
