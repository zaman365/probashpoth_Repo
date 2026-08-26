import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  evaluateEligibilitySchema,
  type EligibilityResponseDto,
  type EvaluateEligibilityDto,
} from '@probash/contracts';
import type { Subject } from '@probash/auth';
import { zodBody } from '../../common/zod.pipe';
import { SessionGuard } from '../../common/session.guard';
import { CurrentSubject } from '../../common/current-subject.decorator';
import { STORAGE, type Storage } from '../../storage/ports';
import { EligibilityService } from './eligibility.service';

@ApiTags('eligibility')
@Controller('eligibility')
export class EligibilityController {
  constructor(
    private readonly eligibility: EligibilityService,
    @Inject(STORAGE) private readonly storage: Storage,
  ) {}

  /**
   * Anonymous evaluation is deliberately supported: a worker must be able to check a
   * route before creating an account (§14.1). Without a profile most facts are
   * unknown, which correctly yields "we cannot determine" rather than a false no.
   */
  @Post('evaluate')
  async evaluateAnonymous(
    @Body(zodBody(evaluateEligibilitySchema)) dto: EvaluateEligibilityDto,
  ): Promise<EligibilityResponseDto> {
    return this.eligibility.evaluateForProfile(undefined, dto);
  }

  @Post('evaluate/me')
  @ApiBearerAuth()
  @UseGuards(SessionGuard)
  async evaluateForMe(
    @CurrentSubject() subject: Subject,
    @Body(zodBody(evaluateEligibilitySchema)) dto: EvaluateEligibilityDto,
  ): Promise<EligibilityResponseDto> {
    const profile = await this.storage.profiles.find((p) => p.userId === subject.userId);
    return this.eligibility.evaluateForProfile(profile, dto, subject.userId);
  }
}
