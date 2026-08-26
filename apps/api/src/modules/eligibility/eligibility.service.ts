import { Inject, Injectable } from '@nestjs/common';
import {
  buildFactBag,
  evaluate,
  selectEffectiveRuleVersion,
  type DecisionTrace,
} from '@probash/rules';
import type { EligibilityResponseDto, EvaluateEligibilityDto } from '@probash/contracts';
import { STORAGE, type Storage } from '../../storage/ports';
import { ClockService } from '../../core/clock.service';
import { EventOutboxService } from '../../core/event-outbox.service';
import { CatalogueService } from '../catalogue/catalogue.service';
import type { ProfileRecord } from '../../storage/records';

/**
 * §19, §48 — deterministic eligibility. Four outcomes, always with a trace.
 * There is no score, no probability, and no model in this path (ADR 0003).
 */
@Injectable()
export class EligibilityService {
  constructor(
    @Inject(STORAGE) private readonly storage: Storage,
    private readonly clock: ClockService,
    private readonly catalogue: CatalogueService,
    private readonly events: EventOutboxService,
  ) {}

  async evaluateForProfile(
    profile: ProfileRecord | undefined,
    dto: EvaluateEligibilityDto,
    actorRef?: string,
  ): Promise<EligibilityResponseDto> {
    const route = await this.storage.routeVersions.require(dto.routeVersionId);
    const ruleVersions = await this.storage.ruleVersions.list(
      (r) => r.ruleId === route.eligibilityRuleId,
    );
    const effective = selectEffectiveRuleVersion(ruleVersions, this.clock.now());

    const facts = buildFactBag({
      ageYears: profile?.ageYears,
      nationality: 'BD',
      occupationKey: dto.facts?.occupationKey ?? profile?.occupationKey,
      experienceMonths: dto.facts?.experienceMonths ?? profile?.experienceMonths,
      educationLevel: dto.facts?.educationLevel ?? profile?.educationLevel,
      hasValidPassport: dto.facts?.hasValidPassport ?? profile?.hasValidPassport,
      passportValidMonths: profile?.passportValidMonths,
      hasBmetRegistration: profile?.hasBmetRegistration,
      hasPoliceClearance: profile?.hasPoliceClearance,
      languageCertificates: dto.facts?.languageCertificates ?? profile?.languageCertificates,
      skillCertificates: dto.facts?.skillCertificates ?? profile?.skillCertificates,
      medicallyFit: profile?.medicallyFit,
      hasEmployerOffer: dto.facts?.hasEmployerOffer,
      destinationCountry: route.destinationCountry,
      routeStatus: route.status,
    });

    const trace: DecisionTrace = evaluate(effective ? [effective] : [], facts, {
      now: this.clock.now(),
    });

    const sourceIds = [
      ...route.sourceIds,
      ...trace.sources.map((s) => s.sourceId),
      ...(effective?.sourceIds ?? []),
    ];

    await this.events.publish(
      'EligibilityEvaluated',
      {
        result: trace.result,
        routeStatus: route.status,
        missingFactCount: trace.missingFacts.length,
      },
      { actorRef, routeRef: route.routeId, countryCode: route.destinationCountry },
    );

    return {
      routeVersionId: route.id,
      trace: trace as unknown as EligibilityResponseDto['trace'],
      sources: await this.catalogue.sourceSummaries(sourceIds),
      // §19 — an undeterminable answer always offers a human, never a guess.
      humanReviewOffered: trace.result === 'unknown',
    };
  }
}
