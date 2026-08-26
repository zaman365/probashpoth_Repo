import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Subject } from '@probash/auth';
import { DomainError } from '@probash/domain';
import {
  outcomeAggregateQuerySchema,
  reviewOutcomeSchema,
  type ReviewOutcomeDto,
} from '@probash/contracts';
import { CurrentSubject } from '../../common/current-subject.decorator';
import { SessionGuard } from '../../common/session.guard';
import { zodBody } from '../../common/zod.pipe';
import { OutcomesService } from './outcomes.service';

@ApiTags('outcomes')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('outcomes')
export class OutcomesController {
  constructor(private readonly outcomes: OutcomesService) {}

  @Post('reviews/:path/:id')
  review(
    @CurrentSubject() subject: Subject,
    @Param('path') path: string,
    @Param('id') id: string,
    @Body(zodBody(reviewOutcomeSchema)) body: ReviewOutcomeDto,
  ) {
    if (path !== 'work' && path !== 'study') {
      throw new DomainError('VALIDATION_FAILED', 'Invalid outcome path');
    }
    return this.outcomes.reviewOutcome(subject, path, id, body);
  }

  @Get('institutional/:organizationId')
  institutional(
    @CurrentSubject() subject: Subject,
    @Param('organizationId') organizationId: string,
    @Query('path') path?: string,
  ) {
    if (path !== 'work' && path !== 'study') {
      throw new DomainError('VALIDATION_FAILED', 'path must be work or study');
    }
    return this.outcomes.institutionalAnalytics(subject, organizationId, path);
  }
}

@ApiTags('outcomes')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('me/outcomes')
export class MyOutcomesController {
  constructor(private readonly outcomes: OutcomesService) {}

  @Get('follow-ups')
  followUps(@CurrentSubject() subject: Subject) {
    return this.outcomes.followUps(subject.userId);
  }

  @Get('comparisons')
  comparisons(@CurrentSubject() subject: Subject) {
    return this.outcomes.comparisons(subject.userId);
  }
}

@ApiTags('public-outcomes')
@Controller('public/outcomes')
export class PublicOutcomesController {
  constructor(private readonly outcomes: OutcomesService) {}

  @Get('aggregates')
  aggregate(
    @Query('path') path?: string,
    @Query('country') countryCode?: string,
    @Query('organization') organizationId?: string,
    @Query('currency') currency?: string,
  ) {
    return this.outcomes.aggregate(
      outcomeAggregateQuerySchema.parse({
        path,
        countryCode: countryCode?.toUpperCase(),
        organizationId,
        currency: currency?.toUpperCase(),
      }),
    );
  }
}
