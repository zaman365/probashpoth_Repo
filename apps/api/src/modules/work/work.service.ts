import { Inject, Injectable } from '@nestjs/common';
import type { Subject } from '@probash/auth';
import { DomainError, uuidv7, type MoneyJson } from '@probash/domain';
import type {
  CreateWorkApplicationDto,
  DecideWorkOfferDto,
  RecordWorkOutcomeDto,
  WorkApplicationDto,
  WorkCvDto,
  WorkDashboardDto,
  WorkDiscoveryQueryDto,
  WorkDiscoveryResultDto,
  WorkOfferDecisionDto,
  WorkOfferReviewDto,
  WorkOutcomeDto,
} from '@probash/contracts';
import { STORAGE, type Storage } from '../../storage/ports';
import { ClockService } from '../../core/clock.service';
import { AuditService } from '../../core/audit.service';
import { EventOutboxService } from '../../core/event-outbox.service';
import { PassportService } from '../passport/passport.service';
import { EligibilityService } from '../eligibility/eligibility.service';
import { CatalogueService } from '../catalogue/catalogue.service';
import { JobsService } from '../jobs/jobs.service';
import { CasesService } from '../cases/cases.service';
import { CostsService } from '../costs/costs.service';
import type { ProfileRecord, RouteVersionRecord } from '../../storage/records';

const ELIGIBILITY_ORDER = { eligible: 0, conditional: 1, unknown: 2, ineligible: 3 } as const;

@Injectable()
export class WorkService {
  constructor(
    @Inject(STORAGE) private readonly storage: Storage,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly events: EventOutboxService,
    private readonly passport: PassportService,
    private readonly eligibility: EligibilityService,
    private readonly catalogue: CatalogueService,
    private readonly jobs: JobsService,
    private readonly cases: CasesService,
    private readonly costs: CostsService,
  ) {}

  private async eligibilityProfile(userId: string): Promise<ProfileRecord | undefined> {
    const legacy = await this.storage.profiles.find((entry) => entry.userId === userId);
    const bundle = await this.passport.getBundle(userId);
    if (!legacy) return undefined;
    return {
      ...legacy,
      occupationKey:
        bundle.work.targetOccupationKeys[0] ??
        bundle.work.currentOccupationKey ??
        legacy.occupationKey,
      experienceMonths: bundle.work.totalExperienceMonths ?? legacy.experienceMonths,
      hasValidPassport:
        bundle.shared.identity.passportStatus === undefined
          ? legacy.hasValidPassport
          : bundle.shared.identity.passportStatus === 'valid',
      passportValidMonths:
        bundle.shared.identity.passportValidityMonths ?? legacy.passportValidMonths,
      hasBmetRegistration: bundle.work.bmetRegistrationReady ?? legacy.hasBmetRegistration,
      hasPoliceClearance: bundle.work.policeClearanceReady ?? legacy.hasPoliceClearance,
      skillCertificates:
        bundle.work.credentials.length > 0
          ? bundle.work.credentials.map((entry) => entry.title)
          : legacy.skillCertificates,
      medicallyFit: bundle.work.medicallyFit ?? legacy.medicallyFit,
      destinationPreferences:
        bundle.shared.preferences.preferredCountries.length > 0
          ? bundle.shared.preferences.preferredCountries
          : legacy.destinationPreferences,
    };
  }

  private salaryRange(jobs: Awaited<ReturnType<JobsService['list']>>): {
    minimum: MoneyJson;
    maximum: MoneyJson;
    sampleSize: number;
  } | null {
    if (jobs.length === 0) return null;
    const currencies = new Set(jobs.map((job) => job.monthlySalary.currency));
    if (currencies.size !== 1) return null;
    const currency = jobs[0]!.monthlySalary.currency;
    const values = jobs.map((job) => BigInt(job.monthlySalary.minorUnits));
    return {
      minimum: { minorUnits: values.reduce((a, b) => (a < b ? a : b)).toString(), currency },
      maximum: { minorUnits: values.reduce((a, b) => (a > b ? a : b)).toString(), currency },
      sampleSize: values.length,
    };
  }

  private preparationDays(route: RouteVersionRecord, missingFactKeys: string[]): number | null {
    const matching = route.requirements.filter(
      (requirement) => requirement.factKey && missingFactKeys.includes(requirement.factKey),
    );
    if (matching.length === 0 || matching.some((requirement) => !requirement.estimatedDays)) {
      return null;
    }
    return matching.reduce((sum, requirement) => sum + requirement.estimatedDays!, 0);
  }

  async discover(userId: string, query: WorkDiscoveryQueryDto): Promise<WorkDiscoveryResultDto> {
    const bundle = await this.passport.getBundle(userId);
    const assessment = await this.passport.assess(userId);
    const profile = await this.eligibilityProfile(userId);
    const rawRoutes = await this.storage.routeVersions.list(
      (route) => route.publicationStatus === 'published' && route.purpose !== 'study',
    );
    const visibleRoutes = await this.catalogue.listRoutes({ purpose: 'work' });
    const visibleIds = new Set(visibleRoutes.map((route) => route.id));
    const occupationKey =
      query.occupationKey ??
      bundle.work.targetOccupationKeys[0] ??
      bundle.work.currentOccupationKey ??
      profile?.occupationKey;

    const opportunities = [];
    for (const route of rawRoutes.filter((entry) => visibleIds.has(entry.id))) {
      if (query.countryCode && route.destinationCountry !== query.countryCode.toUpperCase())
        continue;
      const allJobs = await this.jobs.list({
        country: route.destinationCountry,
        occupationKey: query.mode === 'country' ? undefined : occupationKey,
      });
      const routeJobIds = new Set(
        (await this.storage.jobs.list((job) => job.routeVersionId === route.id)).map(
          (job) => job.id,
        ),
      );
      const routeJobs = allJobs.filter((job) => routeJobIds.has(job.id));
      const decision = await this.eligibility.evaluateForProfile(
        profile,
        {
          routeVersionId: route.id,
          facts: {
            occupationKey,
            hasEmployerOffer: routeJobs.length > 0 ? true : undefined,
          },
        },
        userId,
      );
      const summary = visibleRoutes.find((entry) => entry.id === route.id)!;
      const missingActions = [
        ...decision.trace.remediable.map(
          (entry) => entry.preparation ?? { bn: entry.label.bn, en: entry.label.en },
        ),
        ...decision.trace.missingFacts.map((entry) => entry.label),
      ];
      const missingKeys = decision.trace.missingFacts.map((entry) => entry.factKey);
      opportunities.push({
        route: summary,
        eligibility: decision.trace,
        readinessPercent: assessment.work.readinessPercent,
        missingActions,
        estimatedPreparationDays: this.preparationDays(route, missingKeys),
        openJobCount: routeJobs.length,
        salaryRange: this.salaryRange(routeJobs),
        livingCost: { amount: null, status: 'unknown' as const },
        estimatedSavings: { amount: null, status: 'unknown' as const },
        longTermRoute: route.permanentPathwayNotes,
        sourceQuality: route.isSyntheticDemoData
          ? ('review_required' as const)
          : route.verifiedBy.startsWith('research:not-human')
            ? ('review_required' as const)
            : ('official' as const),
        sources: decision.sources,
      });
    }

    opportunities.sort((left, right) => {
      const eligibility =
        ELIGIBILITY_ORDER[left.eligibility.result] - ELIGIBILITY_ORDER[right.eligibility.result];
      if (eligibility !== 0) return eligibility;
      if (left.openJobCount !== right.openJobCount) return right.openJobCount - left.openJobCount;
      return left.route.officialName.en.localeCompare(right.route.officialName.en);
    });

    await this.events.publish(
      'WorkDiscoveryGenerated',
      { mode: query.mode, resultCount: opportunities.length },
      { actorRef: userId },
    );
    return {
      mode: query.mode,
      passportVersion: bundle.shared.version,
      generatedAt: this.clock.nowIso(),
      opportunities,
      note: {
        bn: 'প্রস্তুতি স্কোর ভিসা বা চাকরি পাওয়ার সম্ভাবনা নয়। অজানা তথ্য অজানাই রাখা হয়েছে।',
        en: 'Readiness is not a probability of a job or visa. Unknown facts remain unknown.',
      },
    };
  }

  async generateCv(
    userId: string,
    format: WorkCvDto['format'] = 'standard_english',
  ): Promise<WorkCvDto> {
    const bundle = await this.passport.getBundle(userId);
    const occupation =
      bundle.work.targetOccupationKeys[0] ?? bundle.work.currentOccupationKey ?? 'Professional';
    return {
      format,
      generatedAt: this.clock.nowIso(),
      passportVersion: bundle.shared.version,
      headline: occupation,
      summary:
        bundle.work.totalExperienceMonths === undefined
          ? `${occupation} profile — experience duration not supplied.`
          : `${occupation} with ${bundle.work.totalExperienceMonths} months of recorded experience.`,
      experience: bundle.work.employmentHistory.map((entry) => ({
        employerName: entry.employerName,
        occupationKey: entry.occupationKey,
        startDate: entry.startedAt,
        endDate: entry.endedAt,
        responsibilities: entry.responsibilities,
        evidenceDocumentIds: entry.evidenceDocumentIds,
      })),
      skills: bundle.work.technicalSkills,
      languages: bundle.study.languageEvidence.map((entry) =>
        [entry.language, entry.level ?? entry.selfAssessedLevel, entry.testName, entry.overallScore]
          .filter(Boolean)
          .join(' — '),
      ),
      credentials: bundle.work.credentials.map((entry) => ({
        title: entry.title,
        verificationStatus: entry.verificationStatus,
      })),
      warning: {
        bn: 'শুধু আপনার দেওয়া তথ্য ব্যবহার করা হয়েছে। পাঠানোর আগে সব তথ্য ও প্রমাণ যাচাই করুন।',
        en: 'Only your recorded facts were used. Verify every claim and its evidence before sending.',
      },
    };
  }

  async createApplication(
    subject: Subject,
    input: CreateWorkApplicationDto,
  ): Promise<WorkApplicationDto> {
    const job = await this.storage.jobs.require(input.jobId);
    const profile = await this.eligibilityProfile(subject.userId);
    const eligibility = await this.eligibility.evaluateForProfile(
      profile,
      { routeVersionId: job.routeVersionId, facts: { hasEmployerOffer: true } },
      subject.userId,
    );
    if (eligibility.trace.result === 'ineligible') {
      throw new DomainError(
        'PRECONDITION_FAILED',
        'This profile is not eligible for the job route',
      );
    }
    if (eligibility.trace.result !== 'eligible' && !input.eligibilityAcknowledged) {
      throw new DomainError(
        'PRECONDITION_FAILED',
        'Acknowledge conditional or unknown eligibility before applying',
      );
    }
    const mobilityCase = await this.cases.create(subject, {
      routeVersionId: job.routeVersionId,
      jobId: job.id,
      purpose: 'work',
    });
    const now = this.clock.nowIso();
    const application: WorkApplicationDto = {
      id: uuidv7(),
      userId: subject.userId,
      jobId: job.id,
      caseId: mobilityCase.id,
      status: 'submitted',
      eligibilityAtSubmission: eligibility.trace.result,
      submittedAt: now,
      updatedAt: now,
    };
    await this.storage.workApplications.put(application);
    await this.audit.record({
      actorUserId: subject.userId,
      action: 'work_application.submitted',
      resourceType: 'work_application',
      resourceId: application.id,
      caseId: mobilityCase.id,
    });
    await this.events.publish(
      'WorkApplicationSubmitted',
      { eligibility: eligibility.trace.result },
      { actorRef: subject.userId, caseRef: mobilityCase.id, countryCode: job.destinationCountry },
    );
    return application;
  }

  async listApplications(userId: string): Promise<WorkApplicationDto[]> {
    return (await this.storage.workApplications.list((entry) => entry.userId === userId)).sort(
      (left, right) => right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  private async requireApplication(userId: string, applicationId: string) {
    const application = await this.storage.workApplications.require(applicationId);
    if (application.userId !== userId) throw new DomainError('FORBIDDEN', 'Application not owned');
    return application;
  }

  async offerReview(subject: Subject, applicationId: string): Promise<WorkOfferReviewDto> {
    const application = await this.requireApplication(subject.userId, applicationId);
    const job = await this.jobs.detail(application.jobId);
    const mobilityCase = await this.cases.detail(subject, application.caseId);
    const costPlan = await this.costs.getPlan(application.caseId);
    const rawJob = await this.storage.jobs.require(application.jobId);
    const scans = await this.storage.scans.list(
      (scan) =>
        scan.userId === subject.userId &&
        scan.matchedJobPublicId === rawJob.publicId &&
        (scan.verdict === 'HIGH_RISK' || scan.verdict === 'UNKNOWN_HUMAN_CHECK_REQUIRED'),
    );
    const unresolvedRiskIds = scans.map((scan) => scan.id);
    return {
      application,
      job,
      case: mobilityCase,
      costPlan,
      unresolvedRiskIds,
      takeHomeEstimate: { amount: null, status: 'unknown' },
      breakEvenMonths: { value: null, status: 'unknown' },
      acceptanceBlocked: application.status !== 'offer_received',
      acknowledgementRequired: unresolvedRiskIds.length > 0,
    };
  }

  async decideOffer(
    subject: Subject,
    applicationId: string,
    input: DecideWorkOfferDto,
  ): Promise<WorkOfferDecisionDto> {
    const application = await this.requireApplication(subject.userId, applicationId);
    if (application.status !== 'offer_received') {
      throw new DomainError('PRECONDITION_FAILED', 'No employer offer has been recorded');
    }
    const review = await this.offerReview(subject, applicationId);
    const unacknowledged = review.unresolvedRiskIds.filter(
      (riskId) => !input.acknowledgedRiskIds.includes(riskId),
    );
    if (input.decision === 'accept' && unacknowledged.length > 0) {
      throw new DomainError(
        'PRECONDITION_FAILED',
        'Every unresolved high-risk item must be explicitly acknowledged',
        { details: { unacknowledgedRiskIds: unacknowledged } },
      );
    }
    const decision: WorkOfferDecisionDto = {
      id: uuidv7(),
      applicationId,
      userId: subject.userId,
      decision: input.decision === 'accept' ? 'accepted' : 'declined',
      unresolvedRiskIds: review.unresolvedRiskIds,
      acknowledgedRiskIds: input.acknowledgedRiskIds,
      decidedAt: this.clock.nowIso(),
    };
    await this.storage.workOfferDecisions.put(decision);
    await this.storage.workApplications.put({
      ...application,
      status: decision.decision === 'accepted' ? 'accepted' : 'withdrawn',
      updatedAt: decision.decidedAt,
    });
    await this.audit.record({
      actorUserId: subject.userId,
      action: `work_offer.${decision.decision}`,
      resourceType: 'work_offer_decision',
      resourceId: decision.id,
      caseId: application.caseId,
      metadata: { acknowledgedRiskCount: String(decision.acknowledgedRiskIds.length) },
    });
    return decision;
  }

  async recordOutcome(userId: string, input: RecordWorkOutcomeDto): Promise<WorkOutcomeDto> {
    const mobilityCase = await this.storage.cases.require(input.caseId);
    if (mobilityCase.ownerUserId !== userId || mobilityCase.purpose !== 'work') {
      throw new DomainError('FORBIDDEN', 'Work case not owned');
    }
    const outcome: WorkOutcomeDto = {
      id: uuidv7(),
      userId,
      jobId: mobilityCase.jobId,
      ...input,
      observedAt: this.clock.nowIso(),
      reviewStatus: 'pending_human_review',
    };
    await this.storage.workOutcomes.put(outcome);
    await this.audit.record({
      actorUserId: userId,
      action: 'work_outcome.recorded',
      resourceType: 'work_outcome',
      resourceId: outcome.id,
      caseId: input.caseId,
    });
    await this.events.publish(
      'WorkOutcomeRecorded',
      {
        departed: Boolean(input.departed),
        arrived: Boolean(input.arrived),
        pendingHumanReview: true,
      },
      { actorRef: userId, caseRef: input.caseId },
    );
    return outcome;
  }

  async dashboard(subject: Subject): Promise<WorkDashboardDto> {
    const bundle = await this.passport.getBundle(subject.userId);
    const applications = await this.listApplications(subject.userId);
    const allCases = (await this.cases.list(subject)).filter(
      (mobilityCase) =>
        mobilityCase.purpose === 'work' && mobilityCase.ownerUserId === subject.userId,
    );
    const nextActions = allCases.flatMap((mobilityCase) => {
      const task = mobilityCase.tasks.find((entry) => entry.status !== 'done');
      return task
        ? [{ caseId: mobilityCase.id, taskId: task.id, label: task.title, status: task.status }]
        : [];
    });
    return {
      passportVersion: bundle.shared.version,
      applications,
      cases: allCases,
      nextActions,
      arrivalModeCaseIds: allCases
        .filter((entry) => ['ARRIVED', 'POST_ARRIVAL_VERIFIED', 'ACTIVE'].includes(entry.state))
        .map((entry) => entry.id),
      rightsNotice: {
        bn: 'অধিকার ও জরুরি সহায়তার তথ্য দেশ ও রুটের অফিসিয়াল উৎস থেকে যাচাই করে দেখুন। এটি আইনি পরামর্শ নয়।',
        en: 'Check rights and emergency guidance against official country and route sources. This is not legal advice.',
      },
    };
  }
}
