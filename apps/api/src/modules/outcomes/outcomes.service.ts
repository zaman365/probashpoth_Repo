import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { Subject } from '@probash/auth';
import { DomainError, uuidv7, type MoneyJson } from '@probash/domain';
import type {
  InstitutionalAnalyticsDto,
  OutcomeAggregateDto,
  OutcomeAggregateQueryDto,
  OutcomeFollowUpDto,
  OutcomeReviewDto,
  PromisedActualComparisonDto,
  ReviewOutcomeDto,
  TrustGraphEdgeDto,
} from '@probash/contracts';
import { STORAGE, type Storage } from '../../storage/ports';
import { ClockService } from '../../core/clock.service';
import { AuditService } from '../../core/audit.service';
import { EventOutboxService } from '../../core/event-outbox.service';

const REVIEWER_ROLES: Subject['roles'] = ['compliance_reviewer', 'fraud_analyst', 'platform_admin'];
const ANALYTICS_ROLES: Subject['roles'] = [
  'employer_staff',
  'recruiter_staff',
  'institution_staff',
  'provider_staff',
  'gov_officer',
  'researcher',
  'compliance_reviewer',
  'platform_admin',
];
const MINIMUM_AGGREGATE_COHORT = 5 as const;

interface ResolvedOutcome {
  path: 'work' | 'study';
  outcomeId: string;
  userId: string;
  countryCode: string;
  organizationIds: string[];
  currency?: string;
  actualCost?: MoneyJson;
  promisedMatched: boolean | null;
  positiveOutcome: boolean | null;
}

@Injectable()
export class OutcomesService {
  constructor(
    @Inject(STORAGE) private readonly storage: Storage,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly events: EventOutboxService,
  ) {}

  private hasRole(subject: Subject, roles: Subject['roles']): boolean {
    return subject.roles.some((role) => roles.includes(role));
  }

  private reviewStatus(
    review: OutcomeReviewDto | undefined,
  ): PromisedActualComparisonDto['reviewStatus'] {
    return review?.decision ?? 'pending';
  }

  private async latestReview(
    path: 'work' | 'study',
    outcomeId: string,
  ): Promise<OutcomeReviewDto | undefined> {
    const reviews = await this.storage.outcomeReviews.list(
      (entry) => entry.path === path && entry.outcomeId === outcomeId,
    );
    return reviews.sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))[0];
  }

  async reviewOutcome(
    subject: Subject,
    path: 'work' | 'study',
    outcomeId: string,
    input: ReviewOutcomeDto,
  ): Promise<OutcomeReviewDto> {
    if (!this.hasRole(subject, REVIEWER_ROLES) || !subject.mfaSatisfied) {
      throw new DomainError('FORBIDDEN', 'Outcome review requires reviewer role and MFA');
    }
    const outcome =
      path === 'work'
        ? await this.storage.workOutcomes.require(outcomeId)
        : await this.storage.studyOutcomes.require(outcomeId);
    if (outcome.userId === subject.userId) {
      throw new DomainError('FORBIDDEN', 'Reviewers cannot verify their own outcomes');
    }
    if (await this.latestReview(path, outcomeId)) {
      throw new DomainError('CONFLICT', 'Outcome already has a review decision');
    }
    for (const documentId of input.evidenceDocumentIds) {
      await this.storage.documents.require(documentId);
    }
    const review: OutcomeReviewDto = {
      id: uuidv7(),
      path,
      outcomeId,
      outcomeOwnerUserId: outcome.userId,
      reviewerUserId: subject.userId,
      ...input,
      reviewedAt: this.clock.nowIso(),
    };
    await this.storage.outcomeReviews.put(review);
    await this.audit.record({
      actorUserId: subject.userId,
      action: 'outcome.reviewed',
      resourceType: 'outcome',
      resourceId: outcomeId,
      metadata: { path, decision: input.decision },
    });
    await this.events.publish(
      'OutcomeReviewDecided',
      { path, decision: input.decision },
      { actorRef: subject.userId },
    );
    return review;
  }

  private followUpStatus(dueAt: string, recordedAt?: string): OutcomeFollowUpDto['status'] {
    if (recordedAt && Date.parse(recordedAt) >= Date.parse(dueAt) - 7 * 86_400_000) {
      return 'recorded';
    }
    return Date.parse(dueAt) <= this.clock.now().getTime() ? 'due' : 'upcoming';
  }

  private followUp(
    path: 'work' | 'study',
    resourceId: string,
    baseAt: string,
    checkpointDays: 90 | 180,
    recordedAt?: string,
  ): OutcomeFollowUpDto {
    const dueAt = new Date(Date.parse(baseAt) + checkpointDays * 86_400_000).toISOString();
    return {
      id: createHash('sha256')
        .update(`${path}:${resourceId}:${checkpointDays}`)
        .digest('hex')
        .slice(0, 24),
      path,
      resourceId,
      checkpointDays,
      dueAt,
      status: this.followUpStatus(dueAt, recordedAt),
      label: {
        bn: `${checkpointDays} দিনের ফলাফল যাচাই`,
        en: `${checkpointDays}-day outcome check`,
      },
    };
  }

  async followUps(userId: string): Promise<OutcomeFollowUpDto[]> {
    const workCases = await this.storage.cases.list(
      (entry) => entry.ownerUserId === userId && entry.purpose === 'work',
    );
    const studyApplications = await this.storage.studyApplications.list(
      (entry) => entry.userId === userId,
    );
    const workOutcomes = await this.storage.workOutcomes.list((entry) => entry.userId === userId);
    const studyOutcomes = await this.storage.studyOutcomes.list((entry) => entry.userId === userId);
    const result: OutcomeFollowUpDto[] = [];
    for (const mobilityCase of workCases) {
      const observedAt = workOutcomes
        .filter((entry) => entry.caseId === mobilityCase.id)
        .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0]?.observedAt;
      result.push(
        this.followUp('work', mobilityCase.id, mobilityCase.createdAt, 90, observedAt),
        this.followUp('work', mobilityCase.id, mobilityCase.createdAt, 180, observedAt),
      );
    }
    for (const application of studyApplications) {
      const observedAt = studyOutcomes
        .filter((entry) => entry.applicationId === application.id)
        .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0]?.observedAt;
      result.push(
        this.followUp('study', application.id, application.submittedAt, 90, observedAt),
        this.followUp('study', application.id, application.submittedAt, 180, observedAt),
      );
    }
    return result.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  }

  private comparisonState(value: boolean | null | undefined): 'matched' | 'different' | 'unknown' {
    return value === true ? 'matched' : value === false ? 'different' : 'unknown';
  }

  async comparisons(userId: string): Promise<PromisedActualComparisonDto[]> {
    const result: PromisedActualComparisonDto[] = [];
    for (const outcome of await this.storage.workOutcomes.list(
      (entry) => entry.userId === userId,
    )) {
      const mobilityCase = await this.storage.cases.require(outcome.caseId);
      const job = mobilityCase.jobId
        ? await this.storage.jobs.require(mobilityCase.jobId)
        : undefined;
      const review = await this.latestReview('work', outcome.id);
      result.push({
        id: `comparison_${outcome.id}`,
        path: 'work',
        outcomeId: outcome.id,
        resourceId: job?.id ?? mobilityCase.id,
        reviewStatus: this.reviewStatus(review),
        fields: [
          {
            key: 'salary',
            promised: job?.terms.monthlySalary ?? null,
            actual: outcome.actualMonthlySalary ?? null,
            state: this.comparisonState(outcome.salaryMatched),
          },
          {
            key: 'expected_employer',
            promised: job ? true : null,
            actual: outcome.joinedExpectedEmployer ?? null,
            state: this.comparisonState(outcome.joinedExpectedEmployer),
          },
          {
            key: 'occupation',
            promised: job?.occupationId ?? null,
            actual: outcome.occupationMatched ?? null,
            state: this.comparisonState(outcome.occupationMatched),
          },
          {
            key: 'accommodation',
            promised: job?.terms.accommodationProvided ?? null,
            actual: outcome.accommodationMatched ?? null,
            state: this.comparisonState(outcome.accommodationMatched),
          },
          {
            key: 'worker_cost',
            promised: job?.allowedWorkerCost ?? null,
            actual: outcome.actualWorkerCost ?? null,
            state: 'unknown',
          },
        ],
        note: {
          bn: 'ব্যবহারকারীর সম্মত তথ্য; মানব যাচাই ছাড়া এটি পাবলিক ট্রাস্ট স্কোরে যায় না।',
          en: 'User-consented evidence; it does not affect public trust until human review.',
        },
      });
    }
    for (const outcome of await this.storage.studyOutcomes.list(
      (entry) => entry.userId === userId,
    )) {
      const application = await this.storage.studyApplications.require(outcome.applicationId);
      const program = await this.storage.courses.require(application.programId);
      const review = await this.latestReview('study', outcome.id);
      const tuitionState =
        outcome.actualTuition &&
        outcome.actualTuition.currency === program.tuition.currency &&
        outcome.actualTuition.minorUnits === program.tuition.minorUnits
          ? 'matched'
          : outcome.actualTuition
            ? 'different'
            : 'unknown';
      result.push({
        id: `comparison_${outcome.id}`,
        path: 'study',
        outcomeId: outcome.id,
        resourceId: program.id,
        reviewStatus: this.reviewStatus(review),
        fields: [
          {
            key: 'tuition',
            promised: program.tuition,
            actual: outcome.actualTuition ?? null,
            state: tuitionState,
          },
          {
            key: 'enrolment',
            promised: true,
            actual: outcome.enrolled ?? null,
            state: this.comparisonState(outcome.enrolled),
          },
          {
            key: 'scholarship',
            promised: null,
            actual: outcome.scholarshipObtained ?? null,
            state: 'unknown',
          },
          {
            key: 'post_study_job',
            promised: null,
            actual: outcome.postStudyJobObtained ?? null,
            state: 'unknown',
          },
        ],
        note: {
          bn: 'স্কলারশিপ ও কর্ম-পরবর্তী প্রতিশ্রুতি সোর্সে অজানা থাকলে তুলনাতেও অজানা থাকে।',
          en: 'Scholarship and post-study promises remain unknown when source evidence is unknown.',
        },
      });
    }
    return result;
  }

  private async resolveWorkOutcome(outcomeId: string): Promise<ResolvedOutcome> {
    const outcome = await this.storage.workOutcomes.require(outcomeId);
    const mobilityCase = await this.storage.cases.require(outcome.caseId);
    const job = mobilityCase.jobId
      ? await this.storage.jobs.require(mobilityCase.jobId)
      : undefined;
    return {
      path: 'work',
      outcomeId,
      userId: outcome.userId,
      countryCode: mobilityCase.destinationCountry,
      organizationIds: job
        ? [job.employerOrganizationId, job.recruiterOrganizationId].filter(
            (value): value is string => Boolean(value),
          )
        : [],
      currency: outcome.actualWorkerCost?.currency,
      actualCost: outcome.actualWorkerCost,
      promisedMatched:
        outcome.salaryMatched === undefined && outcome.joinedExpectedEmployer === undefined
          ? null
          : outcome.salaryMatched === true && outcome.joinedExpectedEmployer !== false,
      positiveOutcome:
        outcome.arrived === undefined
          ? null
          : outcome.arrived === true && outcome.joinedExpectedEmployer !== false,
    };
  }

  private async resolveStudyOutcome(outcomeId: string): Promise<ResolvedOutcome> {
    const outcome = await this.storage.studyOutcomes.require(outcomeId);
    const application = await this.storage.studyApplications.require(outcome.applicationId);
    const program = await this.storage.courses.require(application.programId);
    const institution = await this.storage.institutions.require(application.institutionId);
    return {
      path: 'study',
      outcomeId,
      userId: outcome.userId,
      countryCode: institution.countryCode,
      organizationIds: [institution.id],
      currency: outcome.actualTuition?.currency,
      actualCost: outcome.actualTuition,
      promisedMatched:
        outcome.actualTuition === undefined
          ? (outcome.enrolled ?? null)
          : outcome.enrolled === true &&
            outcome.actualTuition.currency === program.tuition.currency &&
            outcome.actualTuition.minorUnits === program.tuition.minorUnits,
      positiveOutcome:
        outcome.enrolled ?? outcome.graduated ?? outcome.postStudyJobObtained ?? null,
    };
  }

  private median(values: bigint[]): bigint {
    const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return sorted[middle]!;
    return (sorted[middle - 1]! + sorted[middle]!) / 2n;
  }

  async aggregate(query: OutcomeAggregateQueryDto): Promise<OutcomeAggregateDto> {
    const verifiedReviews = await this.storage.outcomeReviews.list(
      (entry) => entry.path === query.path && entry.decision === 'verified',
    );
    const resolved: ResolvedOutcome[] = [];
    for (const review of verifiedReviews) {
      const item =
        query.path === 'work'
          ? await this.resolveWorkOutcome(review.outcomeId)
          : await this.resolveStudyOutcome(review.outcomeId);
      if (query.countryCode && item.countryCode !== query.countryCode.toUpperCase()) continue;
      if (query.organizationId && !item.organizationIds.includes(query.organizationId)) continue;
      if (query.currency && item.currency !== query.currency.toUpperCase()) continue;
      resolved.push(item);
    }
    const suppressed = resolved.length < MINIMUM_AGGREGATE_COHORT;
    const currencies = new Set(
      resolved
        .map((entry) => entry.actualCost?.currency)
        .filter((value): value is string => !!value),
    );
    const currency =
      query.currency?.toUpperCase() ?? (currencies.size === 1 ? [...currencies][0] : undefined);
    const costValues = currency
      ? resolved
          .filter((entry) => entry.actualCost?.currency === currency)
          .map((entry) => BigInt(entry.actualCost!.minorUnits))
      : [];
    const knownPromise = resolved.filter((entry) => entry.promisedMatched !== null);
    const knownPositive = resolved.filter((entry) => entry.positiveOutcome !== null);
    const money = (value: bigint | undefined): MoneyJson | null =>
      value === undefined || !currency ? null : { minorUnits: value.toString(), currency };
    const metrics = suppressed
      ? null
      : {
          actualCostMedian: money(costValues.length ? this.median(costValues) : undefined),
          actualCostMinimum: money(
            costValues.length
              ? costValues.reduce((left, right) => (left < right ? left : right))
              : undefined,
          ),
          actualCostMaximum: money(
            costValues.length
              ? costValues.reduce((left, right) => (left > right ? left : right))
              : undefined,
          ),
          promisedTermsMatchedPercent:
            knownPromise.length === 0
              ? null
              : Math.round(
                  (knownPromise.filter((entry) => entry.promisedMatched).length /
                    knownPromise.length) *
                    1000,
                ) / 10,
          positiveOutcomePercent:
            knownPositive.length === 0
              ? null
              : Math.round(
                  (knownPositive.filter((entry) => entry.positiveOutcome).length /
                    knownPositive.length) *
                    1000,
                ) / 10,
        };
    await this.events.publish(
      'OutcomeAggregateViewed',
      { path: query.path, cohortSize: resolved.length, suppressed },
      { countryCode: query.countryCode?.toUpperCase(), organizationRef: query.organizationId },
    );
    return {
      path: query.path,
      countryCode: query.countryCode?.toUpperCase(),
      organizationId: query.organizationId,
      currency,
      minimumCohortSize: MINIMUM_AGGREGATE_COHORT,
      reviewedCohortSize: resolved.length,
      suppressed,
      metrics,
      privacyNotice: {
        bn: suppressed
          ? 'পাঁচটির কম মানব-যাচাইকৃত ফলাফল থাকায় গোপনীয়তার জন্য মেট্রিক লুকানো হয়েছে।'
          : 'সমষ্টিতে শুধু সম্মত ও মানব-যাচাইকৃত ফলাফল আছে; ব্যক্তিগত রেকর্ড দেখানো হয় না।',
        en: suppressed
          ? 'Metrics are hidden because fewer than five human-reviewed outcomes are available.'
          : 'Only consented, human-reviewed outcomes are aggregated; no individual record is shown.',
      },
    };
  }

  private trustEdge(
    organizationId: string,
    signal: TrustGraphEdgeDto['signal'],
    weight: number,
    evidenceCount: number,
  ): TrustGraphEdgeDto {
    const cohortId = createHash('sha256')
      .update(`${organizationId}:${signal}:${evidenceCount}`)
      .digest('hex')
      .slice(0, 20);
    return {
      id: `edge_${cohortId}`,
      fromType: 'organization',
      fromId: organizationId,
      toType: signal === 'upheld_complaint' ? 'complaint_cohort' : 'outcome_cohort',
      toId: `cohort_${cohortId}`,
      signal,
      weight,
      evidenceCount,
      public: evidenceCount >= MINIMUM_AGGREGATE_COHORT,
      generatedAt: this.clock.nowIso(),
    };
  }

  async institutionalAnalytics(
    subject: Subject,
    organizationId: string,
    path: 'work' | 'study',
  ): Promise<InstitutionalAnalyticsDto> {
    if (!this.hasRole(subject, ANALYTICS_ROLES)) {
      throw new DomainError('FORBIDDEN', 'Institutional analytics role required');
    }
    if (
      subject.organizationId &&
      subject.organizationId !== organizationId &&
      !this.hasRole(subject, ['gov_officer', 'researcher', 'compliance_reviewer', 'platform_admin'])
    ) {
      throw new DomainError('FORBIDDEN', 'Analytics are scoped to your organization');
    }
    const organization = await this.storage.organizations.get(organizationId);
    const institution = organization
      ? undefined
      : await this.storage.institutions.get(organizationId);
    if (!organization && !institution) {
      throw new DomainError('NOT_FOUND', 'Organization was not found');
    }
    const aggregate = await this.aggregate({ path, organizationId });
    const complaints = await this.storage.complaints.count(
      (entry) =>
        entry.organizationId === organizationId &&
        entry.status === 'resolved' &&
        (entry.safetyState === 'verified' || entry.safetyState === 'resolved'),
    );
    const trustEdges: TrustGraphEdgeDto[] = [];
    if (!aggregate.suppressed && aggregate.metrics) {
      const matched = aggregate.metrics.promisedTermsMatchedPercent;
      if (matched !== null) {
        trustEdges.push(
          this.trustEdge(
            organizationId,
            'terms_matched',
            Math.max(-1, Math.min(1, (matched - 50) / 50)),
            aggregate.reviewedCohortSize,
          ),
        );
      }
      const positive = aggregate.metrics.positiveOutcomePercent;
      if (positive !== null) {
        trustEdges.push(
          this.trustEdge(
            organizationId,
            'positive_outcome',
            Math.max(-1, Math.min(1, (positive - 50) / 50)),
            aggregate.reviewedCohortSize,
          ),
        );
      }
    }
    if (complaints >= MINIMUM_AGGREGATE_COHORT) {
      trustEdges.push(this.trustEdge(organizationId, 'upheld_complaint', -1, complaints));
    }
    const safetyOverride = Boolean(organization?.suspendedAt) || complaints > 0;
    const outcomeSignal = aggregate.metrics?.promisedTermsMatchedPercent ?? null;
    return {
      organizationId,
      aggregate,
      trustEdges,
      organicRanking: {
        eligibleForOutcomeSignal: !aggregate.suppressed && outcomeSignal !== null,
        outcomeSignal: safetyOverride ? 0 : outcomeSignal,
        paymentInfluence: false,
        safetyOverride,
      },
    };
  }
}
