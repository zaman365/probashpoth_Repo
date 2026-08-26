import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Subject } from '@probash/auth';
import {
  addStudyShortlistSchema,
  createStudyApplicationSchema,
  recordStudyOutcomeSchema,
  reviewStudyStatementSchema,
  studyDiscoveryQuerySchema,
  studyWorkHandoffSchema,
  type AddStudyShortlistDto,
  type CreateStudyApplicationDto,
  type RecordStudyOutcomeDto,
  type ReviewStudyStatementDto,
  type StudyWorkHandoffDto,
} from '@probash/contracts';
import { CurrentSubject } from '../../common/current-subject.decorator';
import { SessionGuard } from '../../common/session.guard';
import { zodBody } from '../../common/zod.pipe';
import { StudyService } from './study.service';

@ApiTags('study-os')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('study')
export class StudyController {
  constructor(private readonly study: StudyService) {}

  @Get('discover')
  async discover(
    @CurrentSubject() subject: Subject,
    @Query('mode') mode?: string,
    @Query('level') targetLevel?: string,
    @Query('country') countryCode?: string,
    @Query('budgetBdt') budgetBdt?: string,
  ) {
    return this.study.discover(
      subject.userId,
      studyDiscoveryQuerySchema.parse({
        mode,
        targetLevel,
        countryCode: countryCode?.toUpperCase(),
        budgetBdt,
      }),
    );
  }

  @Get('programs/:id')
  async program(@CurrentSubject() subject: Subject, @Param('id') id: string) {
    return this.study.program(subject.userId, id);
  }

  @Get('shortlist')
  async shortlist(@CurrentSubject() subject: Subject) {
    return this.study.listShortlist(subject.userId);
  }

  @Post('shortlist')
  async addShortlist(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(addStudyShortlistSchema)) body: AddStudyShortlistDto,
  ) {
    return this.study.addShortlist(subject.userId, body);
  }

  @Delete('shortlist/:id')
  async removeShortlist(@CurrentSubject() subject: Subject, @Param('id') id: string) {
    await this.study.removeShortlist(subject.userId, id);
    return { removed: true };
  }

  @Get('calendar')
  async calendar(@CurrentSubject() subject: Subject) {
    return this.study.calendar(subject.userId);
  }

  @Get('applications')
  async applications(@CurrentSubject() subject: Subject) {
    return this.study.listApplications(subject.userId);
  }

  @Post('applications')
  async apply(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(createStudyApplicationSchema)) body: CreateStudyApplicationDto,
  ) {
    return this.study.createApplication(subject, body);
  }

  @Post('materials/statement-review')
  async reviewStatement(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(reviewStudyStatementSchema)) body: ReviewStudyStatementDto,
  ) {
    return this.study.reviewStatement(subject.userId, body);
  }

  @Post('outcomes')
  async outcome(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(recordStudyOutcomeSchema)) body: RecordStudyOutcomeDto,
  ) {
    return this.study.recordOutcome(subject.userId, body);
  }

  @Post('work-handoff')
  async handoff(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(studyWorkHandoffSchema)) body: StudyWorkHandoffDto,
  ) {
    return this.study.handoff(subject.userId, body);
  }

  @Get('dashboard')
  async dashboard(@CurrentSubject() subject: Subject) {
    return this.study.dashboard(subject);
  }
}
