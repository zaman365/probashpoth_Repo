import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Subject } from '@probash/auth';
import {
  createAlertSubscriptionSchema,
  updateAcademicProfileSchema,
  updateMigrationPassportSchema,
  updateWorkProfileSchema,
  type CreateAlertSubscriptionDto,
  type UpdateAcademicProfileDto,
  type UpdateMigrationPassportDto,
  type UpdateWorkProfileDto,
} from '@probash/contracts';
import { CurrentSubject } from '../../common/current-subject.decorator';
import { SessionGuard } from '../../common/session.guard';
import { zodBody } from '../../common/zod.pipe';
import { PassportService } from './passport.service';

@ApiTags('passport')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('me/passport')
export class PassportController {
  constructor(private readonly passport: PassportService) {}

  @Get()
  async get(@CurrentSubject() subject: Subject) {
    return this.passport.getBundle(subject.userId);
  }

  @Patch('shared')
  async updateShared(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(updateMigrationPassportSchema)) body: UpdateMigrationPassportDto,
  ) {
    return this.passport.updateShared(subject.userId, body);
  }

  @Patch('work')
  async updateWork(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(updateWorkProfileSchema)) body: UpdateWorkProfileDto,
  ) {
    return this.passport.updateWork(subject.userId, body);
  }

  @Patch('study')
  async updateStudy(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(updateAcademicProfileSchema)) body: UpdateAcademicProfileDto,
  ) {
    return this.passport.updateStudy(subject.userId, body);
  }

  @Post('assessments')
  async assess(@CurrentSubject() subject: Subject) {
    return this.passport.assess(subject.userId);
  }

  @Post('matches')
  async match(@CurrentSubject() subject: Subject) {
    return this.passport.match(subject.userId);
  }

  @Get('history')
  async history(@CurrentSubject() subject: Subject) {
    return this.passport.history(subject.userId);
  }

  @Get('alerts')
  async alerts(@CurrentSubject() subject: Subject) {
    return this.passport.listAlerts(subject.userId);
  }

  @Post('alerts')
  async createAlert(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(createAlertSubscriptionSchema)) body: CreateAlertSubscriptionDto,
  ) {
    return this.passport.createAlert(subject.userId, body);
  }

  @Delete('alerts/:id')
  async removeAlert(@CurrentSubject() subject: Subject, @Param('id') id: string) {
    await this.passport.removeAlert(subject.userId, id);
    return { removed: true };
  }
}
