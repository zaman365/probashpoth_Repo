import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Subject } from '@probash/auth';
import {
  agencyCheckInputSchema,
  applicationQaInputSchema,
  confirmOfficialActionSchema,
  copilotQuestionSchema,
  feeCheckInputSchema,
  mobilityRoiInputSchema,
  quickCheckInputSchema,
  savedItemInputSchema,
  structuredOfferCheckInputSchema,
  universalDeadlineInputSchema,
  type AgencyCheckInputDto,
  type ApplicationQaInputDto,
  type ConfirmOfficialActionDto,
  type CopilotQuestionDto,
  type FeeCheckInputDto,
  type MobilityRoiInputDto,
  type QuickCheckInputDto,
  type SavedItemInputDto,
  type StructuredOfferCheckInputDto,
  type UniversalDeadlineInputDto,
} from '@probash/contracts';
import { CurrentSubject } from '../../common/current-subject.decorator';
import { SessionGuard } from '../../common/session.guard';
import { zodBody } from '../../common/zod.pipe';
import { UnifiedMobilityService } from './unified.service';

@ApiTags('unified-mobility-public')
@Controller()
export class UnifiedPublicController {
  constructor(private readonly unified: UnifiedMobilityService) {}

  @Post('quick-check')
  quickCheck(@Body(zodBody(quickCheckInputSchema)) input: QuickCheckInputDto) {
    return this.unified.quickCheck(input);
  }

  @Get('route-coverages')
  routeCoverages(@Query('country') country?: string) {
    return this.unified.routeCoverages(country);
  }

  @Get('official-actions')
  officialActions(@Query('country') country?: string) {
    return this.unified.listOfficialActions(country);
  }

  @Get('trust-center')
  trustCenter() {
    return this.unified.trustCenter();
  }

  @Post('safety/agency-check')
  agencyCheck(@Body(zodBody(agencyCheckInputSchema)) input: AgencyCheckInputDto) {
    return this.unified.agencyCheck(input);
  }

  @Post('safety/fee-check')
  feeCheck(@Body(zodBody(feeCheckInputSchema)) input: FeeCheckInputDto) {
    return this.unified.feeCheck(input);
  }

  @Post('safety/offer-check')
  offerCheck(@Body(zodBody(structuredOfferCheckInputSchema)) input: StructuredOfferCheckInputDto) {
    return this.unified.structuredOfferCheck({ ...input, kind: 'JOB_OFFER' });
  }

  @Post('safety/contract-check')
  contractCheck(
    @Body(zodBody(structuredOfferCheckInputSchema)) input: StructuredOfferCheckInputDto,
  ) {
    return this.unified.structuredOfferCheck({ ...input, kind: 'CONTRACT' });
  }

  @Get('mobility-capabilities')
  capabilities() {
    return this.unified.capabilities();
  }
}

@ApiTags('unified-mobility-applicant')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('me')
export class UnifiedApplicantController {
  constructor(private readonly unified: UnifiedMobilityService) {}

  @Post('official-actions')
  officialAction(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(confirmOfficialActionSchema)) input: ConfirmOfficialActionDto,
  ) {
    return this.unified.confirmOfficialAction(subject, input);
  }

  @Post('application-qa')
  applicationQa(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(applicationQaInputSchema)) input: ApplicationQaInputDto,
  ) {
    return this.unified.applicationQa(subject, input);
  }

  @Post('mobility-roi')
  mobilityRoi(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(mobilityRoiInputSchema)) input: MobilityRoiInputDto,
    @Query('caseId') caseId?: string,
  ) {
    return this.unified.mobilityRoi(subject, input, caseId);
  }

  @Get('deadlines')
  deadlines(@CurrentSubject() subject: Subject) {
    return this.unified.listDeadlines(subject.userId);
  }

  @Post('deadlines')
  createDeadline(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(universalDeadlineInputSchema)) input: UniversalDeadlineInputDto,
  ) {
    return this.unified.createDeadline(subject.userId, input);
  }

  @Get('saved-items')
  savedItems(@CurrentSubject() subject: Subject) {
    return this.unified.listSaved(subject.userId);
  }

  @Post('saved-items')
  saveItem(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(savedItemInputSchema)) input: SavedItemInputDto,
  ) {
    return this.unified.save(subject.userId, input);
  }

  @Post('copilot')
  copilot(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(copilotQuestionSchema)) input: CopilotQuestionDto,
  ) {
    return this.unified.copilot(subject, input);
  }

  @Get('journey-cases/:id/command-center')
  commandCenter(@CurrentSubject() subject: Subject, @Param('id') id: string) {
    return this.unified.caseCommandCenter(subject, id);
  }

  @Get('freshness-dashboard')
  freshness(@CurrentSubject() subject: Subject) {
    return this.unified.freshnessDashboard(subject);
  }
}
