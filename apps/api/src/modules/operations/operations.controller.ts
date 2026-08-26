import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Subject } from '@probash/auth';
import {
  createComplaintSchema,
  createHumanReviewSchema,
  createPublicationChangeSchema,
  decideHumanReviewSchema,
  reviewPublicationChangeSchema,
  updateComplaintSchema,
  type CreateComplaintDto,
  type CreateHumanReviewDto,
  type CreatePublicationChangeDto,
  type DecideHumanReviewDto,
  type ReviewPublicationChangeDto,
  type UpdateComplaintDto,
} from '@probash/contracts';
import { CurrentSubject } from '../../common/current-subject.decorator';
import { SessionGuard } from '../../common/session.guard';
import { zodBody } from '../../common/zod.pipe';
import { OperationsService } from './operations.service';

@ApiTags('trust-operations')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('operations')
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Post('complaints')
  async createComplaint(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(createComplaintSchema)) body: CreateComplaintDto,
  ) {
    return this.operations.createComplaint(subject.userId, body);
  }

  @Get('complaints')
  async complaints(@CurrentSubject() subject: Subject) {
    return this.operations.listComplaints(subject);
  }

  @Get('complaints/:id')
  async complaint(@CurrentSubject() subject: Subject, @Param('id') id: string) {
    return this.operations.getComplaint(subject, id);
  }

  @Post('complaints/:id/actions')
  async complaintAction(
    @CurrentSubject() subject: Subject,
    @Param('id') id: string,
    @Body(zodBody(updateComplaintSchema)) body: UpdateComplaintDto,
  ) {
    return this.operations.updateComplaint(subject, id, body);
  }

  @Post('reviews')
  async requestReview(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(createHumanReviewSchema)) body: CreateHumanReviewDto,
  ) {
    return this.operations.createReview(subject.userId, body);
  }

  @Get('reviews')
  async reviews(@CurrentSubject() subject: Subject) {
    return this.operations.listReviews(subject);
  }

  @Post('reviews/:id/decision')
  async decideReview(
    @CurrentSubject() subject: Subject,
    @Param('id') id: string,
    @Body(zodBody(decideHumanReviewSchema)) body: DecideHumanReviewDto,
  ) {
    return this.operations.decideReview(subject, id, body);
  }

  @Post('publication-changes')
  async createChange(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(createPublicationChangeSchema)) body: CreatePublicationChangeDto,
  ) {
    return this.operations.createPublicationChange(subject, body);
  }

  @Post('publication-changes/:id/submit')
  async submitChange(@CurrentSubject() subject: Subject, @Param('id') id: string) {
    return this.operations.submitPublicationChange(subject, id);
  }

  @Post('publication-changes/:id/review')
  async reviewChange(
    @CurrentSubject() subject: Subject,
    @Param('id') id: string,
    @Body(zodBody(reviewPublicationChangeSchema)) body: ReviewPublicationChangeDto,
  ) {
    return this.operations.reviewPublicationChange(subject, id, body);
  }
}

@ApiTags('service-directory')
@Controller('services')
export class ServiceDirectoryController {
  constructor(private readonly operations: OperationsService) {}

  @Get()
  async list(@Query('type') type?: string, @Query('country') countryCode?: string) {
    return this.operations.serviceDirectory({ type, countryCode: countryCode?.toUpperCase() });
  }
}
