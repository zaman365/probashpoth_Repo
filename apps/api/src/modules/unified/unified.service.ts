import { Inject, Injectable } from '@nestjs/common';
import type { Subject } from '@probash/auth';
import { featureFlags, type Env, type FeatureFlags } from '@probash/config';
import type {
  AgencyCheckInputDto,
  AgencyCheckResultDto,
  ApplicationQaInputDto,
  ApplicationQaResultDto,
  CapabilityRegistryItemDto,
  ConfirmOfficialActionDto,
  CopilotAnswerDto,
  CopilotQuestionDto,
  FeeCheckInputDto,
  FeeCheckResultDto,
  FreshnessDashboardDto,
  MobilityRoiInputDto,
  MobilityRoiResultDto,
  OfficialActionCompletionDto,
  OfficialActionDto,
  QuickCheckInputDto,
  QuickCheckResultDto,
  RouteCoverageDto,
  SavedItemDto,
  SavedItemInputDto,
  StructuredOfferCheckInputDto,
  StructuredOfferCheckResultDto,
  TrustCenterDto,
  UniversalDeadlineDto,
  UniversalDeadlineInputDto,
} from '@probash/contracts';
import {
  calculateMobilityRoi,
  DomainError,
  evaluateApplicationQa,
  freshnessOf,
  routeAcceptsApplications,
  uuidv7,
  type BangladeshAccessibility,
  type CoverageMaturity,
  type LocalizedText,
  type MobilityGoal,
} from '@probash/domain';
import { STORAGE, type Storage } from '../../storage/ports';
import { ENV } from '../../core/tokens';
import { ClockService } from '../../core/clock.service';
import { AuditService } from '../../core/audit.service';
import { EventOutboxService } from '../../core/event-outbox.service';
import { EligibilityService } from '../eligibility/eligibility.service';
import { CatalogueService } from '../catalogue/catalogue.service';
import type { RouteVersionRecord } from '../../storage/records';
import type { ApplicationQaReviewRecord } from '../../storage/unified-records';

const bnEn = (bn: string, en: string): LocalizedText => ({ bn, en });

function routeGoal(route: RouteVersionRecord): MobilityGoal {
  if (route.purpose === 'work') return 'WORK';
  if (route.purpose === 'study') return 'STUDY';
  if (route.purpose === 'training') return 'TRAINING';
  return 'EXPLORE';
}

function defaultCoverage(route: RouteVersionRecord): CoverageMaturity {
  if (route.coverageMaturity) return route.coverageMaturity;
  // Development catalogue records are never promoted into real journey coverage.
  if (route.isSyntheticDemoData) return 'RESEARCH_ONLY';
  if (route.publicationStatus !== 'published') return 'RESEARCH_ONLY';
  if (route.eligibilityRuleId && route.sourceIds.length > 0) return 'ELIGIBILITY_SUPPORTED';
  return 'INFORMATION_VERIFIED';
}

function defaultAccessibility(route: RouteVersionRecord): BangladeshAccessibility {
  if (route.bangladeshAccessibility) return route.bangladeshAccessibility;
  if (!routeAcceptsApplications(route.status)) return 'NOT_ELIGIBLE';
  if (
    route.purpose === 'work' &&
    ['employer_sponsored', 'government_program'].includes(route.status)
  )
    return 'POTENTIALLY_ELIGIBLE';
  return 'NOT_CONFIRMED';
}

function checklistFor(
  route: RouteVersionRecord,
  sourcesExist: boolean,
): RouteCoverageDto['checklist'] {
  const sourceBacked = sourcesExist && route.sourceIds.length > 0;
  return {
    officialSourcesMapped: sourceBacked,
    visaRoutesMapped: Boolean(route.visaClass || route.permitClass),
    costsMapped: route.feeRuleIds.length > 0,
    recognitionMapped: route.requirements.some((item) => item.kind === 'education'),
    languageMapped: route.requirements.some((item) => item.kind === 'language'),
    opportunitiesMapped: false,
    providerVerificationAvailable: false,
    complaintAndEmergencySourcesMapped: route.riskNotices.length > 0,
    arrivalTasksMapped: route.postArrivalObligations.length > 0,
    contentReviewed: route.publicationStatus === 'published' && !route.isSyntheticDemoData,
    legalReviewComplete: false,
    dataOwnerAssigned: Boolean(route.coverageOwner),
    freshnessSlaConfigured: route.reviewCadenceDays > 0,
  };
}

@Injectable()
export class UnifiedMobilityService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(STORAGE) private readonly storage: Storage,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly events: EventOutboxService,
    private readonly eligibility: EligibilityService,
    private readonly catalogue: CatalogueService,
  ) {}

  private requireFeature(key: keyof FeatureFlags, label: string): void {
    const flags = featureFlags(this.env);
    if (!flags.unifiedMobilityCore || !flags[key]) {
      throw new DomainError('PRECONDITION_FAILED', `${label} is disabled in this environment`);
    }
  }

  private async ensureOfficialActions(): Promise<void> {
    if ((await this.storage.officialActions.count()) > 0) return;
    const source = await this.storage.sources.get('src_bd_oep');
    if (!source) return;
    const checked = source.lastReviewedAt;
    const actions: OfficialActionDto[] = [
      {
        id: 'official_bd_oep_registration',
        countryCode: 'BD',
        authority: source.authority,
        actionType: 'BMET_REGISTRATION',
        title: bnEn('বিএমইটি / ওইপি নিবন্ধন', 'BMET / OEP registration'),
        description: bnEn(
          'সরকারি সিস্টেমে নিবন্ধনের আগে কী লাগবে দেখে নিন। কাজটি সরকারি সাইটেই সম্পন্ন হবে।',
          'Review what you need first. Registration itself is completed on the official system.',
        ),
        officialUrl: 'https://www.oep.gov.bd/',
        isExternal: true,
        requiresAccount: true,
        requiresInPerson: false,
        feeType: 'VARIES',
        sourceRecordId: source.id,
        lastVerifiedAt: checked,
        status: 'ACTIVE',
        preparationRequirementIds: [],
        legalReviewRequired: false,
      },
      {
        id: 'official_bd_raims_agency',
        countryCode: 'BD',
        authority: bnEn('জনশক্তি, কর্মসংস্থান ও প্রশিক্ষণ ব্যুরো', 'BMET'),
        actionType: 'AGENCY_VERIFICATION',
        title: bnEn('রিক্রুটিং এজেন্সির লাইসেন্স যাচাই', 'Verify a recruiting-agency licence'),
        description: bnEn(
          'এজেন্সির নাম ও লাইসেন্স সরকারি রেকর্ডে মিলিয়ে দেখুন।',
          'Compare the agency name and licence with the official register.',
        ),
        officialUrl: 'https://raims.bmet.gov.bd/agencies',
        isExternal: true,
        requiresAccount: false,
        requiresInPerson: false,
        feeType: 'FREE',
        sourceRecordId: source.id,
        lastVerifiedAt: checked,
        status: 'ACTIVE',
        preparationRequirementIds: [],
        legalReviewRequired: false,
      },
      {
        id: 'official_bd_boesl_application',
        countryCode: 'BD',
        authority: bnEn('বাংলাদেশ ওভারসিজ এমপ্লয়মেন্ট অ্যান্ড সার্ভিসেস লিমিটেড', 'BOESL'),
        actionType: 'BOESL_APPLICATION',
        title: bnEn('বিওইএসএল সরকারি চাকরিতে আবেদন', 'Apply for a BOESL government-recruited job'),
        description: bnEn(
          'সুযোগ ও আবেদন সরকারি বিআরএমএস সিস্টেমে যাচাই ও সম্পন্ন করুন।',
          'Verify the opportunity and complete the application in the official BRMS system.',
        ),
        officialUrl: 'https://brms.boesl.gov.bd/',
        isExternal: true,
        requiresAccount: true,
        requiresInPerson: false,
        feeType: 'VARIES',
        sourceRecordId: source.id,
        lastVerifiedAt: checked,
        status: 'NEEDS_REVIEW',
        preparationRequirementIds: [],
        legalReviewRequired: false,
      },
      {
        id: 'official_bd_complaint',
        countryCode: 'BD',
        authority: bnEn(
          'প্রবাসী কল্যাণ ও বৈদেশিক কর্মসংস্থান মন্ত্রণালয়',
          "Ministry of Expatriates' Welfare and Overseas Employment",
        ),
        actionType: 'OFFICIAL_COMPLAINT',
        title: bnEn('সরকারি অভিযোগের পথ', 'Official complaint channel'),
        description: bnEn(
          'প্রবাসযাত্রায় অভিযোগ নথিবদ্ধ করতে পারেন; সরকারি প্রতিকার সরকারি কর্তৃপক্ষই দেয়।',
          'You may record a complaint in Probashjatra; official redress is provided by the authority.',
        ),
        officialUrl: 'https://probashi.gov.bd/',
        isExternal: true,
        requiresAccount: false,
        requiresInPerson: false,
        feeType: 'FREE',
        sourceRecordId: 'src_bd_probashi',
        lastVerifiedAt: checked,
        status: 'NEEDS_REVIEW',
        preparationRequirementIds: [],
        legalReviewRequired: true,
      },
    ];
    const routes = await this.storage.routeVersions.list(
      (route) => route.publicationStatus === 'published',
    );
    for (const route of routes) {
      const routeSource = await this.storage.sources.get(route.sourceIds[0] ?? '');
      if (!routeSource || routeSource.countryCode === 'BD') continue;
      actions.push({
        id: `official_route_${route.id}`,
        countryCode: route.destinationCountry,
        authority: routeSource.authority,
        actionType: 'DESTINATION_VISA_APPLICATION',
        title: bnEn(
          `${route.officialName.bn} — সরকারি ভিসা/পারমিট`,
          `${route.officialName.en} — official visa or permit`,
        ),
        description: bnEn(
          'প্রয়োজনীয় কাগজপত্র প্রস্তুত করে সংশ্লিষ্ট কর্তৃপক্ষের সরকারি সাইটে প্রক্রিয়া সম্পন্ন করুন।',
          'Prepare the required evidence and complete the process on the responsible authority’s official site.',
        ),
        officialUrl: routeSource.url,
        isExternal: true,
        requiresAccount: true,
        requiresInPerson: route.requirements.some(
          (requirement) =>
            requirement.kind === 'medical' || requirement.kind === 'police_clearance',
        ),
        feeType: route.feeRuleIds.length > 0 ? 'VARIES' : 'UNKNOWN',
        sourceRecordId: routeSource.id,
        lastVerifiedAt: route.lastReviewedAt,
        status: routeAcceptsApplications(route.status) ? 'ACTIVE' : 'TEMPORARILY_UNAVAILABLE',
        preparationRequirementIds: route.requirements.map((requirement) => requirement.id),
        legalReviewRequired: false,
      });
    }
    for (const action of actions) await this.storage.officialActions.put(action);
  }

  async listOfficialActions(countryCode?: string): Promise<OfficialActionDto[]> {
    this.requireFeature('officialActionHandoffs', 'Official action handoffs');
    await this.ensureOfficialActions();
    return this.storage.officialActions.list(
      (item) => !countryCode || item.countryCode === countryCode.toUpperCase(),
    );
  }

  async routeCoverages(countryCode?: string): Promise<RouteCoverageDto[]> {
    this.requireFeature('unifiedMobilityCore', 'Unified mobility core');
    const persisted = await this.storage.routeCoverages.list(
      (item) => !countryCode || item.countryCode === countryCode.toUpperCase(),
    );
    const routes = await this.storage.routeVersions.list(
      (route) =>
        route.publicationStatus === 'published' &&
        (!countryCode || route.destinationCountry === countryCode.toUpperCase()),
    );
    const sourceIds = new Set((await this.storage.sources.list()).map((item) => item.id));
    const byRoute = new Map(persisted.map((item) => [item.routeVersionId, item]));
    return routes.map((route) => {
      const existing = byRoute.get(route.id);
      if (existing) return existing;
      const maturity = defaultCoverage(route);
      return {
        id: `coverage_${route.id}`,
        routeVersionId: route.id,
        countryCode: route.destinationCountry,
        nationalityScope: route.nationalityScope ?? ['BD'],
        maturity,
        officialInformationAvailable: route.sourceIds.some((id) => sourceIds.has(id)),
        eligibilityEngineAvailable: maturity !== 'RESEARCH_ONLY',
        applicationGuidanceAvailable: [
          'JOURNEY_SUPPORTED',
          'PARTNER_SUPPORTED',
          'TRANSACTION_SUPPORTED',
        ].includes(maturity),
        verifiedPartnerAvailable: ['PARTNER_SUPPORTED', 'TRANSACTION_SUPPORTED'].includes(maturity),
        officialFeeDataAvailable: route.feeRuleIds.length > 0,
        processingTimeDataAvailable: Boolean(route.expectedTimeline),
        sourceLastVerifiedAt: route.lastReviewedAt,
        coverageOwner: route.coverageOwner,
        checklist: checklistFor(
          route,
          route.sourceIds.some((id) => sourceIds.has(id)),
        ),
        updatedAt: route.lastReviewedAt ?? route.verifiedAt,
      };
    });
  }

  private async routeCostRange(route: RouteVersionRecord) {
    const all = await this.storage.feeRules.list(
      (fee) => route.feeRuleIds.includes(fee.id) && !fee.unresolved,
    );
    const currencies = [...new Set(all.map((item) => item.amount.currency))];
    if (all.length === 0 || currencies.length !== 1) return undefined;
    const currency = currencies[0]!;
    const workerItems = all.filter((item) => ['worker', 'student'].includes(item.payerKind));
    const total = workerItems.reduce((sum, item) => sum + BigInt(item.amount.minorUnits), 0n);
    return {
      min: { minorUnits: total.toString(), currency },
      max: { minorUnits: total.toString(), currency },
      status: 'ESTIMATED' as const,
    };
  }

  async quickCheck(input: QuickCheckInputDto): Promise<QuickCheckResultDto> {
    this.requireFeature('quickCheck', 'QuickCheck');
    const routes = (
      await this.storage.routeVersions.list((route) => {
        if (route.publicationStatus !== 'published') return false;
        if (input.goal !== 'EXPLORE' && routeGoal(route) !== input.goal) return false;
        return (
          input.preferredCountryCodes.length === 0 ||
          input.preferredCountryCodes
            .map((code) => code.toUpperCase())
            .includes(route.destinationCountry)
        );
      })
    ).slice(0, 8);
    const coverages = new Map(
      (await this.routeCoverages()).map((item) => [item.routeVersionId, item]),
    );
    const results: QuickCheckResultDto['routes'] = [];
    for (const route of routes) {
      const evaluation = await this.eligibility.evaluateForProfile(undefined, {
        routeVersionId: route.id,
        facts: {
          ageYears: input.age,
          occupationKey: input.occupationKey,
          experienceMonths: input.experienceMonths,
          educationLevel: input.educationLevel,
          hasValidPassport: input.hasValidPassport,
          languageCertificates: input.languageCertificates,
          skillCertificates: input.skillCertificates,
          hasEmployerOffer: input.hasEmployerOffer,
        },
      });
      const foreignNationality = input.citizenship.toUpperCase() !== 'BD';
      const missing = evaluation.trace.missingFacts.map((item) => item.label);
      const preparation = evaluation.trace.unsatisfied
        .map((item) => item.preparation ?? item.label)
        .concat(missing);
      const fit = foreignNationality
        ? 'NOT_CURRENTLY_A_FIT'
        : evaluation.trace.result === 'eligible'
          ? 'STRONG_FIT'
          : evaluation.trace.result === 'conditional'
            ? 'NEEDS_PREPARATION'
            : evaluation.trace.result === 'ineligible'
              ? 'NOT_CURRENTLY_A_FIT'
              : 'POSSIBLE_FIT';
      const coverage = coverages.get(route.id);
      const coverageMaturity = coverage?.maturity ?? defaultCoverage(route);
      results.push({
        routeVersionId: route.id,
        routeId: route.routeId,
        title: route.officialName,
        destinationCountry: route.destinationCountry,
        goal: routeGoal(route),
        eligibility: evaluation.trace,
        fit,
        fitReasons:
          evaluation.trace.satisfied.length > 0
            ? evaluation.trace.satisfied.map((item) => item.label)
            : [bnEn('বর্তমান তথ্য সীমিত', 'Current information is limited')],
        preparationGaps: preparation,
        estimatedPreparation:
          preparation.length > 0
            ? { minMonths: 1, maxMonths: Math.max(3, preparation.length * 2) }
            : undefined,
        costRange: await this.routeCostRange(route),
        timeRange: route.expectedTimeline,
        coverageMaturity,
        bangladeshAccessibility: foreignNationality ? 'NOT_ELIGIBLE' : defaultAccessibility(route),
        confidence:
          foreignNationality || coverageMaturity === 'RESEARCH_ONLY'
            ? 'NEEDS_HUMAN_REVIEW'
            : evaluation.trace.result === 'unknown'
              ? 'INCOMPLETE_DATA'
              : 'SUPPORTED_BY_OFFICIAL_SOURCE',
        sources: evaluation.sources,
        lastVerifiedAt: route.lastReviewedAt,
      });
    }
    await this.events.publish('QuickCheckCompleted', {
      goal: input.goal,
      routeCount: results.length,
      incompleteCount: results.filter((item) => item.confidence === 'INCOMPLETE_DATA').length,
    });
    return {
      generatedAt: this.clock.nowIso(),
      accountRequired: false,
      routes: results,
      disclaimer: bnEn(
        'এটি প্রাথমিক যাচাই—চাকরি, ভর্তি বা ভিসার নিশ্চয়তা নয়। আবেদন করার আগে সরকারি উৎস আবার দেখুন।',
        'This is a preliminary check, not a job, admission, or visa guarantee. Recheck official sources before applying.',
      ),
      escalationOffered: results.some((item) =>
        ['INCOMPLETE_DATA', 'NEEDS_HUMAN_REVIEW'].includes(item.confidence),
      ),
    };
  }

  async confirmOfficialAction(
    subject: Subject,
    input: ConfirmOfficialActionDto,
  ): Promise<OfficialActionCompletionDto> {
    this.requireFeature('officialActionHandoffs', 'Official action handoffs');
    await this.ensureOfficialActions();
    await this.storage.officialActions.require(input.actionId);
    if (input.caseId) {
      const mobilityCase = await this.storage.cases.require(input.caseId);
      if (mobilityCase.ownerUserId !== subject.userId)
        throw new DomainError('FORBIDDEN', 'Only the applicant can confirm an official handoff');
    }
    const existing = await this.storage.officialActionCompletions.find(
      (item) =>
        item.userId === subject.userId &&
        item.actionId === input.actionId &&
        item.caseId === input.caseId,
    );
    const now = this.clock.nowIso();
    const completion: OfficialActionCompletionDto = {
      id: existing?.id ?? uuidv7(),
      actionId: input.actionId,
      userId: subject.userId,
      caseId: input.caseId,
      status: input.event,
      handedOffAt: existing?.handedOffAt ?? (input.event === 'HANDED_OFF' ? now : undefined),
      userConfirmedAt: input.event === 'USER_CONFIRMED_COMPLETE' ? now : existing?.userConfirmedAt,
      statusProvenance: 'USER_CONFIRMED',
      updatedAt: now,
    };
    await this.storage.officialActionCompletions.put(completion);
    await this.audit.record({
      actorUserId: subject.userId,
      action: `official_action.${input.event.toLowerCase()}`,
      resourceType: 'official_action',
      resourceId: input.actionId,
      caseId: input.caseId,
      metadata: { provenance: completion.statusProvenance },
    });
    await this.events.publish(
      input.event === 'HANDED_OFF' ? 'OfficialActionHandedOff' : 'OfficialActionUserConfirmed',
      { actionType: input.actionId },
      { actorRef: subject.userId, caseRef: input.caseId },
    );
    return completion;
  }

  private async requireOwnedApplication(userId: string, applicationId: string): Promise<void> {
    const work = await this.storage.workApplications.get(applicationId);
    const study = await this.storage.studyApplications.get(applicationId);
    const owner = work?.userId ?? study?.userId;
    if (!owner) throw new DomainError('NOT_FOUND', 'Application not found');
    if (owner !== userId) throw new DomainError('FORBIDDEN', 'Application belongs to another user');
  }

  async applicationQa(
    subject: Subject,
    input: ApplicationQaInputDto,
  ): Promise<ApplicationQaResultDto> {
    this.requireFeature('applicationQaGate', 'Application QA');
    await this.requireOwnedApplication(subject.userId, input.applicationId);
    const result = evaluateApplicationQa(input);
    const now = this.clock.nowIso();
    const snapshotId = uuidv7();
    const snapshot = {
      id: snapshotId,
      applicationId: input.applicationId,
      applicantUserId: subject.userId,
      profileVersion: input.profileVersion,
      documentIds: input.documentIds,
      applicationPayloadHash: input.applicationPayloadHash,
      renderedSummary: input.renderedSummary,
      costDisclosureIds: input.costDisclosureIds,
      providerVerificationEvidenceIds: input.providerVerificationEvidenceIds,
      createdAt: now,
      approvedAt: input.applicantApproved ? now : undefined,
      approvedByUserId: input.applicantApproved ? subject.userId : undefined,
      assistedByUserId: input.assistedByUserId,
      immutable: true as const,
    };
    await this.storage.submissionSnapshots.put(snapshot);
    const reviewId = uuidv7();
    const review: ApplicationQaReviewRecord = {
      id: reviewId,
      applicationId: input.applicationId,
      ownerUserId: subject.userId,
      snapshotId,
      result: {
        status: result.status,
        checks: result.checks,
        blockers: result.blockers,
        readyToSubmit: result.readyToSubmit,
      },
      reviewedAt: now,
    };
    await this.storage.applicationQaReviews.put(review);
    await this.audit.record({
      actorUserId: subject.userId,
      action: 'application.qa_evaluated',
      resourceType: 'application',
      resourceId: input.applicationId,
      metadata: { status: result.status, blockerCount: String(result.blockers.length) },
    });
    await this.events.publish(
      'ApplicationQaEvaluated',
      {
        status: result.status,
        blockerCount: result.blockers.length,
        ready: result.readyToSubmit,
      },
      { actorRef: subject.userId },
    );
    if (input.applicantApproved)
      await this.events.publish('SubmissionSnapshotApproved', {}, { actorRef: subject.userId });
    return {
      reviewId,
      snapshotId,
      status: result.status,
      checks: result.checks,
      blockers: result.blockers,
      readyToSubmit: result.readyToSubmit,
      immutableSnapshotCreated: true,
    };
  }

  async mobilityRoi(
    subject: Subject,
    input: MobilityRoiInputDto,
    caseId?: string,
  ): Promise<MobilityRoiResultDto> {
    this.requireFeature('mobilityRoi', 'Mobility ROI');
    if (caseId) {
      const mobilityCase = await this.storage.cases.require(caseId);
      if (mobilityCase.ownerUserId !== subject.userId)
        throw new DomainError('FORBIDDEN', 'Case belongs to another user');
    }
    for (const sourceId of input.sourceIds) await this.storage.sources.require(sourceId);
    const calculated = calculateMobilityRoi(input);
    const assessment: MobilityRoiResultDto = {
      id: uuidv7(),
      userId: subject.userId,
      caseId,
      calculatedAt: this.clock.nowIso(),
      ...calculated,
      informationalOnly: true,
    };
    await this.storage.mobilityRoiAssessments.put(assessment);
    await this.events.publish(
      'MobilityRoiCalculated',
      {
        debtRisk: assessment.debtRisk,
        confidence: assessment.confidence,
        warningCount: assessment.warnings.length,
      },
      { actorRef: subject.userId, caseRef: caseId },
    );
    return assessment;
  }

  async listDeadlines(userId: string): Promise<UniversalDeadlineDto[]> {
    this.requireFeature('unifiedMobilityCore', 'Unified mobility core');
    return this.storage.universalDeadlines.list((item) => item.ownerUserId === userId);
  }

  async createDeadline(
    userId: string,
    input: UniversalDeadlineInputDto,
  ): Promise<UniversalDeadlineDto> {
    this.requireFeature('unifiedMobilityCore', 'Unified mobility core');
    if (input.caseId) {
      const mobilityCase = await this.storage.cases.require(input.caseId);
      if (mobilityCase.ownerUserId !== userId)
        throw new DomainError('FORBIDDEN', 'Case is not yours');
    }
    for (const sourceId of input.sourceIds) await this.storage.sources.require(sourceId);
    const now = this.clock.nowIso();
    const deadline: UniversalDeadlineDto = {
      id: uuidv7(),
      ownerUserId: userId,
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    await this.storage.universalDeadlines.put(deadline);
    await this.events.publish(
      'UniversalDeadlineCreated',
      {
        kind: deadline.kind,
        hardness: deadline.hardness,
      },
      { actorRef: userId, caseRef: deadline.caseId },
    );
    return deadline;
  }

  async listSaved(userId: string): Promise<SavedItemDto[]> {
    this.requireFeature('unifiedMobilityCore', 'Unified mobility core');
    return this.storage.savedItems.list((item) => item.userId === userId);
  }

  async save(userId: string, input: SavedItemInputDto): Promise<SavedItemDto> {
    this.requireFeature('unifiedMobilityCore', 'Unified mobility core');
    const existing = await this.storage.savedItems.find(
      (item) =>
        item.userId === userId && item.itemType === input.itemType && item.itemId === input.itemId,
    );
    const now = this.clock.nowIso();
    const saved: SavedItemDto = {
      id: existing?.id ?? uuidv7(),
      userId,
      ...input,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await this.storage.savedItems.put(saved);
    await this.events.publish(
      'SavedItemChanged',
      {
        itemType: saved.itemType,
        state: saved.state,
        compare: saved.compare,
      },
      { actorRef: userId },
    );
    return saved;
  }

  async agencyCheck(input: AgencyCheckInputDto): Promise<AgencyCheckResultDto> {
    this.requireFeature('trustCenter', 'Trust and safety checks');
    const organizations = await this.storage.organizations.list(
      (item) => item.type === 'recruiting_agency',
    );
    const normalizedName = input.agencyName?.trim().toLowerCase();
    const match = organizations.find(
      (item) =>
        (input.licenceNumber &&
          item.licences.some((licence) => licence.number === input.licenceNumber)) ||
        (normalizedName &&
          [item.legalName.bn, item.legalName.en].some((name) =>
            name.toLowerCase().includes(normalizedName),
          )),
    );
    if (!match) {
      await this.events.publish('TrustSafetyCheckCompleted', {
        kind: 'agency',
        status: 'not_verified',
      });
      return {
        status: 'COULD_NOT_VERIFY',
        mismatchWarnings: [
          bnEn(
            'সরকারি/যাচাইকৃত রেকর্ডে মিল পাওয়া যায়নি। এটিকে অপরাধের প্রমাণ ভাববেন না।',
            'No match was found in the available verified record. This is not proof of wrongdoing.',
          ),
        ],
        sources: await this.catalogue.sourceSummaries(['src_bd_oep']),
        conclusiveFraudFinding: false,
      };
    }
    const licence = match.licences[0];
    const licenceExpired = licence?.status === 'expired' || licence?.status === 'revoked';
    const suppliedNameMismatch = Boolean(
      normalizedName &&
      ![match.legalName.bn, match.legalName.en].some((name) =>
        name.toLowerCase().includes(normalizedName),
      ),
    );
    const sourceIds = [
      ...match.verification.facets.flatMap((facet) => (facet.sourceId ? [facet.sourceId] : [])),
      ...(licence?.sourceId ? [licence.sourceId] : []),
    ];
    const status: AgencyCheckResultDto['status'] = licenceExpired
      ? 'LICENSE_EXPIRED'
      : suppliedNameMismatch
        ? 'INFORMATION_DIFFERS'
        : licence?.status === 'active'
          ? 'VERIFIED'
          : 'NEEDS_MANUAL_REVIEW';
    await this.events.publish('TrustSafetyCheckCompleted', { kind: 'agency', status });
    return {
      status,
      officialName: match.legalName,
      licenceNumber: licence?.number,
      licenceStatus: licence?.status,
      validTo: licence?.validTo,
      mismatchWarnings: suppliedNameMismatch
        ? [
            bnEn(
              'দেওয়া নামটি সরকারি নামের সঙ্গে মেলেনি।',
              'The supplied name differs from the official name.',
            ),
          ]
        : [],
      sources: await this.catalogue.sourceSummaries(sourceIds),
      lastVerifiedAt: licence?.lastVerifiedAt ?? match.verification.lastVerifiedAt,
      conclusiveFraudFinding: false,
    };
  }

  async feeCheck(input: FeeCheckInputDto): Promise<FeeCheckResultDto> {
    this.requireFeature('trustCenter', 'Trust and safety checks');
    const route = await this.storage.routeVersions.require(input.routeVersionId);
    if (route.destinationCountry !== input.countryCode.toUpperCase())
      throw new DomainError('VALIDATION_FAILED', 'Route and country do not match');
    const fees = await this.storage.feeRules.list((fee) => route.feeRuleIds.includes(fee.id));
    const official = fees.filter(
      (fee) =>
        fee.payeeKind === 'government' &&
        !fee.unresolved &&
        fee.amount.currency === input.quotedAmount.currency,
    );
    const provider = fees.filter(
      (fee) => !['government', 'worker', 'student'].includes(fee.payeeKind),
    );
    const officialTotal = official.reduce((sum, fee) => sum + BigInt(fee.amount.minorUnits), 0n);
    const quoted = BigInt(input.quotedAmount.minorUnits);
    const difference = quoted > officialTotal ? quoted - officialTotal : 0n;
    const officialActions = await this.listOfficialActions('BD');
    const unresolved = fees.some((fee) => fee.unresolved || fee.legallyAllowed === null);
    await this.events.publish('TrustSafetyCheckCompleted', {
      kind: 'fee',
      unexplainedDifference: difference > 0n,
      unresolved,
    });
    return {
      officialKnownCosts: official.map((fee) => ({
        label: fee.label,
        amount: fee.amount,
        sourceIds: fee.sourceIds,
      })),
      providerDisclosedCosts: provider.map((fee) => ({
        label: fee.label,
        amount: fee.unresolved ? undefined : fee.amount,
        sourceIds: fee.sourceIds,
      })),
      quotedAmount: input.quotedAmount,
      unexplainedDifference:
        difference > 0n
          ? { minorUnits: difference.toString(), currency: input.quotedAmount.currency }
          : undefined,
      warnings: [
        ...(difference > 0n
          ? [
              bnEn(
                'উদ্ধৃত টাকার একটি অংশ ব্যাখ্যা করা যায়নি।',
                'Part of the quoted amount is unexplained.',
              ),
            ]
          : []),
        ...(unresolved
          ? [
              bnEn(
                'কিছু ফি বা আইনি দায় এখনো নিশ্চিত নয়।',
                'Some fees or legal responsibility are not yet confirmed.',
              ),
            ]
          : []),
      ],
      questionsToAsk: [
        bnEn('প্রতিটি ফি কে নিচ্ছে এবং কেন?', 'Who receives each fee and why?'),
        bnEn(
          'সরকারি রসিদ বা লিখিত রিফান্ড নিয়ম কোথায়?',
          'Where is the official receipt or written refund policy?',
        ),
        bnEn(
          'নিয়োগকর্তার দেওয়ার কথা এমন খরচ কি আমার কাছে চাওয়া হচ্ছে?',
          'Am I being asked to pay a cost normally borne by the employer?',
        ),
      ],
      officialActions: officialActions.filter((item) =>
        ['AGENCY_VERIFICATION', 'OFFICIAL_COMPLAINT'].includes(item.actionType),
      ),
      confidence: unresolved ? 'NEEDS_HUMAN_REVIEW' : 'SUPPORTED_BY_OFFICIAL_SOURCE',
    };
  }

  async structuredOfferCheck(
    input: StructuredOfferCheckInputDto,
  ): Promise<StructuredOfferCheckResultDto> {
    this.requireFeature('trustCenter', 'Trust and safety checks');
    const verifiedFacts: LocalizedText[] = [];
    const unverifiedFacts: LocalizedText[] = [];
    const warnings: LocalizedText[] = [];
    const criticalMismatches: LocalizedText[] = [];
    const job = input.publicJobId
      ? await this.storage.jobs.find((item) => item.publicId === input.publicJobId)
      : undefined;
    if (input.publicJobId && !job)
      unverifiedFacts.push(
        bnEn(
          'পাবলিক চাকরি আইডিটি যাচাইকৃত তালিকায় পাওয়া যায়নি।',
          'The public job ID was not found in the verified catalogue.',
        ),
      );
    if (job) {
      verifiedFacts.push(bnEn('চাকরি আইডিটি তালিকায় আছে।', 'The job ID exists in the catalogue.'));
      const employer = await this.storage.organizations.get(job.employerOrganizationId);
      const recruiter = job.recruiterOrganizationId
        ? await this.storage.organizations.get(job.recruiterOrganizationId)
        : undefined;
      if (employer)
        verifiedFacts.push(
          bnEn(
            `রেকর্ডকৃত নিয়োগকর্তা: ${employer.legalName.bn}`,
            `Recorded employer: ${employer.legalName.en}`,
          ),
        );
      if (recruiter)
        verifiedFacts.push(
          bnEn(
            `রেকর্ডকৃত রিক্রুটার: ${recruiter.legalName.bn}`,
            `Recorded recruiter: ${recruiter.legalName.en}`,
          ),
        );
      if (
        input.salary &&
        (input.salary.currency !== job.terms.monthlySalary.currency ||
          input.salary.minorUnits !== job.terms.monthlySalary.minorUnits)
      )
        criticalMismatches.push(
          bnEn(
            'দেওয়া বেতন যাচাইকৃত চাকরির বেতনের সঙ্গে মেলেনি।',
            'The supplied salary differs from the verified job terms.',
          ),
        );
      else if (input.salary)
        verifiedFacts.push(
          bnEn('বেতনের পরিমাণ রেকর্ডের সঙ্গে মিলেছে।', 'The salary matches the recorded terms.'),
        );
      if (
        input.feeRequested &&
        input.feeRequested.currency === job.allowedWorkerCost.currency &&
        BigInt(input.feeRequested.minorUnits) > BigInt(job.allowedWorkerCost.minorUnits)
      )
        criticalMismatches.push(
          bnEn(
            'চাওয়া কর্মী-খরচ প্রকাশিত অনুমোদিত খরচের চেয়ে বেশি।',
            'The requested worker cost exceeds the published allowed worker cost.',
          ),
        );
      if (input.contactDomain && employer?.officialDomain) {
        const supplied = input.contactDomain
          .toLowerCase()
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .split('/')[0];
        const official = employer.officialDomain
          .toLowerCase()
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .split('/')[0];
        if (supplied !== official)
          warnings.push(
            bnEn(
              'যোগাযোগের ডোমেইন নিয়োগকর্তার অফিসিয়াল ডোমেইনের সঙ্গে মেলেনি।',
              'The contact domain differs from the employer’s official domain.',
            ),
          );
      }
    }
    if (input.expectedSalary && input.salary) {
      if (
        input.expectedSalary.currency !== input.salary.currency ||
        input.expectedSalary.minorUnits !== input.salary.minorUnits
      )
        criticalMismatches.push(
          bnEn(
            'অফার ও প্রত্যাশিত/আগের বেতনের মধ্যে পার্থক্য আছে।',
            'The offer salary differs from the expected or earlier salary.',
          ),
        );
    }
    if (input.kind === 'CONTRACT') {
      if (input.hasAllPages === false)
        warnings.push(bnEn('চুক্তির সব পৃষ্ঠা নেই।', 'The contract appears to be missing pages.'));
      if (input.hasSignature === false)
        warnings.push(
          bnEn(
            'চুক্তিতে প্রয়োজনীয় স্বাক্ষর নেই।',
            'The contract is missing a required signature.',
          ),
        );
      if (input.contractLanguageUnderstood === false)
        warnings.push(
          bnEn(
            'না বুঝে চুক্তিতে সই করবেন না; ব্যাখ্যা বা অনুবাদ নিন।',
            'Do not sign a contract you do not understand; obtain an explanation or translation.',
          ),
        );
    }
    if (!input.visaRoute)
      unverifiedFacts.push(
        bnEn(
          'সঠিক ভিসা/পারমিট এখনো নিশ্চিত নয়।',
          'The correct visa or permit has not been confirmed.',
        ),
      );
    if (!input.employerName)
      unverifiedFacts.push(
        bnEn('নিয়োগকর্তার নাম দেওয়া হয়নি।', 'No employer name was provided.'),
      );
    if (!input.jobTitle)
      unverifiedFacts.push(bnEn('পদের নাম দেওয়া হয়নি।', 'No job title was provided.'));
    for (const sourceId of input.sourceIds) await this.storage.sources.require(sourceId);
    const officialActions = (await this.listOfficialActions('BD')).filter((item) =>
      ['AGENCY_VERIFICATION', 'OFFICIAL_COMPLAINT'].includes(item.actionType),
    );
    const confidence: StructuredOfferCheckResultDto['confidence'] =
      criticalMismatches.length > 0 || unverifiedFacts.length > 0
        ? 'NEEDS_HUMAN_REVIEW'
        : job
          ? 'SUPPORTED_BY_PROVIDER_SOURCE'
          : 'INCOMPLETE_DATA';
    await this.events.publish('TrustSafetyCheckCompleted', {
      kind: input.kind === 'CONTRACT' ? 'contract' : 'offer',
      warningCount: warnings.length,
      mismatchCount: criticalMismatches.length,
    });
    return {
      kind: input.kind,
      verifiedFacts,
      unverifiedFacts,
      warnings,
      criticalMismatches,
      questionsToAsk: [
        bnEn(
          'নিয়োগকর্তার অফিসিয়াল ডোমেইন থেকে এটি নিশ্চিত করা যাবে?',
          'Can this be confirmed from the employer’s official domain?',
        ),
        bnEn(
          'ভিসা/পারমিটের সঠিক নাম ও স্পনসর কে?',
          'What is the exact visa or permit and who is the sponsor?',
        ),
        bnEn(
          'প্রতিটি ফি কে নেবে, কেন এবং কী রসিদ দেবে?',
          'Who receives each fee, why, and what receipt will be issued?',
        ),
      ],
      officialActions,
      confidence,
      conclusiveFraudFinding: false,
      humanReviewOffered: confidence === 'NEEDS_HUMAN_REVIEW' || confidence === 'INCOMPLETE_DATA',
    };
  }

  trustCenter(): TrustCenterDto {
    this.requireFeature('trustCenter', 'Trust Center');
    return {
      verificationStatuses: [
        'UNVERIFIED',
        'PENDING',
        'BASIC_VERIFIED',
        'LICENSE_VERIFIED',
        'ENHANCED_VERIFIED',
        'RESTRICTED',
        'SUSPENDED',
        'REMOVED',
        'EXPIRED',
      ],
      providerCategories: [
        'UNIVERSITY',
        'COLLEGE',
        'VOCATIONAL_INSTITUTION',
        'EMPLOYER',
        'RECRUITING_AGENCY',
        'SUB_AGENT',
        'ADVISOR',
        'TRAINING_CENTER',
        'LANGUAGE_CENTER',
        'FINANCE_PROVIDER',
        'INSURANCE_PROVIDER',
        'ACCOMMODATION_PROVIDER',
        'RELOCATION_PROVIDER',
        'TRAVEL_PROVIDER',
        'OTHER',
      ],
      sections: [
        [
          'verification',
          'যাচাই কীভাবে হয়',
          'How verification works',
          'প্রতিটি দাবির প্রমাণ, উৎস, তারিখ, মেয়াদ ও পর্যালোচক রাখা হয়।',
          'Each claim records evidence, source, date, expiry and reviewer.',
        ],
        [
          'jobs',
          'চাকরির প্রস্তাব',
          'Job offers',
          'নিয়োগকর্তা, রিক্রুটার, বেতন, চুক্তি, ভিসা ও ফি আলাদা করে দেখা হয়।',
          'Employer, recruiter, salary, contract, visa and fees are checked separately.',
        ],
        [
          'institutions',
          'প্রতিষ্ঠান ও প্রোগ্রাম',
          'Institutions and programmes',
          'অফিসিয়াল ডোমেইন, স্বীকৃতি, প্রোগ্রাম ও সময়সীমার উৎস দেখানো হয়।',
          'Official domains, recognition, programmes and deadline sources are shown.',
        ],
        [
          'costs',
          'খরচ ও ফি',
          'Costs and fees',
          'সরকারি, প্রদানকারী, ঐচ্ছিক ও প্ল্যাটফর্ম ফি মিশিয়ে দেখানো হয় না।',
          'Official, provider, optional and platform fees are never merged.',
        ],
        [
          'ranking',
          'সুপারিশ ও বাণিজ্যিক সম্পর্ক',
          'Recommendations and commercial relationships',
          'কমিশন বা বিজ্ঞাপন অর্গানিক মিল নির্ধারণ করে না। স্পনসরড ফল আলাদা থাকে।',
          'Commission and advertising do not determine organic fit. Sponsored results stay separate.',
        ],
        [
          'documents',
          'ডকুমেন্ট সুরক্ষা',
          'Document protection',
          'স্পষ্ট সম্মতি, সীমিত অ্যাক্সেস ও অডিট ছাড়া সংবেদনশীল ডকুমেন্ট দেখা যায় না।',
          'Sensitive documents require explicit consent, scoped access and audit.',
        ],
        [
          'complaints',
          'অভিযোগ ও ব্যবস্থা',
          'Complaints and enforcement',
          'অভিযোগ মুছে ফেলা যায় না; পর্যালোচনা, সীমাবদ্ধতা ও প্রতিকার নথিভুক্ত হয়।',
          'Complaints cannot be deleted; review, restrictions and remedy are recorded.',
        ],
        [
          'freshness',
          'তথ্য কতটা নতুন',
          'Data freshness',
          'শেষ যাচাই ও পর্যালোচনার সময়সীমা দৃশ্যমান থাকে।',
          'Last verification and review cadence remain visible.',
        ],
      ].map(([key, titleBn, titleEn, bodyBn, bodyEn]) => ({
        key: key!,
        title: bnEn(titleBn!, titleEn!),
        body: bnEn(bodyBn!, bodyEn!),
      })),
      recommendationNeutrality: {
        organicRankingUsesCommission: false,
        sponsoredSeparated: true,
        partnerRelationshipDisclosed: true,
      },
      safetyBasicsPaywalled: false,
      lastReviewedAt: this.clock.nowIso(),
    };
  }

  async freshnessDashboard(subject: Subject): Promise<FreshnessDashboardDto> {
    this.requireFeature('trustCenter', 'Trust Center');
    if (
      !subject.mfaSatisfied ||
      !subject.roles.some((role) =>
        ['researcher', 'compliance_reviewer', 'platform_admin'].includes(role),
      )
    )
      throw new DomainError('FORBIDDEN', 'Freshness dashboard requires an authorized MFA session');
    const now = this.clock.now();
    const sources = await this.storage.sources.list();
    const routes = await this.storage.routeVersions.list();
    const items: FreshnessDashboardDto['items'] = [
      ...sources.map((source) => ({
        entityType: 'source',
        entityId: source.id,
        countryCode: source.countryCode,
        state: freshnessOf(source.lastReviewedAt, source.reviewCadenceDays, now),
        lastVerifiedAt: source.lastReviewedAt,
        nextReviewDueAt: source.lastReviewedAt
          ? new Date(
              Date.parse(source.lastReviewedAt) + source.reviewCadenceDays * 86_400_000,
            ).toISOString()
          : undefined,
        brokenOfficialLink: source.status === 'UNAVAILABLE',
        pendingHumanReview: source.status === 'REVIEW_REQUIRED',
      })),
      ...routes.map((route) => ({
        entityType: 'route',
        entityId: route.id,
        countryCode: route.destinationCountry,
        state: freshnessOf(route.lastReviewedAt, route.reviewCadenceDays, now),
        lastVerifiedAt: route.lastReviewedAt,
        nextReviewDueAt: route.lastReviewedAt
          ? new Date(
              Date.parse(route.lastReviewedAt) + route.reviewCadenceDays * 86_400_000,
            ).toISOString()
          : undefined,
        brokenOfficialLink: false,
        pendingHumanReview: route.publicationStatus === 'review',
      })),
    ];
    const stateCount = (state: 'fresh' | 'ageing' | 'stale' | 'unknown') =>
      items.filter((item) => item.state === state).length;
    return {
      generatedAt: this.clock.nowIso(),
      totals: {
        fresh: stateCount('fresh'),
        ageing: stateCount('ageing'),
        stale: stateCount('stale'),
        unknown: stateCount('unknown'),
      },
      items,
    };
  }

  async copilot(subject: Subject, input: CopilotQuestionDto): Promise<CopilotAnswerDto> {
    this.requireFeature('groundedCopilot', 'Grounded Copilot');
    let sourceIds: string[] = [];
    let officialActions: OfficialActionDto[] = [];
    let confidence: CopilotAnswerDto['confidence'] = 'INCOMPLETE_DATA';
    let answer = bnEn(
      'এই তথ্যটি এখন নিশ্চিতভাবে যাচাই করা যায়নি। সরকারি উৎস দেখুন অথবা মানব পর্যালোচনা নিন।',
      'This information cannot currently be verified with confidence. Check the official source or request human review.',
    );
    if (input.caseId) {
      const mobilityCase = await this.storage.cases.require(input.caseId);
      if (mobilityCase.ownerUserId !== subject.userId)
        throw new DomainError('FORBIDDEN', 'Case belongs to another user');
    }
    if (input.routeVersionId) {
      const route = await this.storage.routeVersions.require(input.routeVersionId);
      sourceIds = route.sourceIds;
      officialActions = (await this.listOfficialActions()).filter(
        (item) => item.countryCode === 'BD' || item.countryCode === route.destinationCountry,
      );
      const stale =
        freshnessOf(route.lastReviewedAt, route.reviewCadenceDays, this.clock.now()) === 'stale';
      confidence = stale ? 'NEEDS_HUMAN_REVIEW' : 'SUPPORTED_BY_OFFICIAL_SOURCE';
      answer = bnEn(
        `${route.officialName.bn}: ${route.summary.bn} এটি নিশ্চিত ফল নয়; নিচের উৎস ও সরকারি কাজগুলো আবার যাচাই করুন।`,
        `${route.officialName.en}: ${route.summary.en} This is not a guaranteed outcome; recheck the sources and official actions below.`,
      );
    }
    await this.events.publish(
      'CopilotAnswerGenerated',
      {
        confidence,
        sourceCount: sourceIds.length,
        canonicalStateChanged: false,
      },
      { actorRef: subject.userId, caseRef: input.caseId },
    );
    const escalationOffered = ['INCOMPLETE_DATA', 'NEEDS_HUMAN_REVIEW'].includes(confidence);
    if (escalationOffered)
      await this.events.publish(
        'SmartEscalationOffered',
        { reason: 'insufficient_confidence' },
        {
          actorRef: subject.userId,
          caseRef: input.caseId,
        },
      );
    return {
      answer,
      confidence,
      sourceIds,
      officialActions,
      generatedAt: this.clock.nowIso(),
      canonicalStateChanged: false,
      escalationOffered,
    };
  }

  capabilities(): CapabilityRegistryItemDto[] {
    this.requireFeature('unifiedMobilityCore', 'Unified mobility core');
    const item = (
      key: string,
      priority: 'P1' | 'P2',
      status: CapabilityRegistryItemDto['status'],
      bn: string,
      en: string,
      safeguards: LocalizedText[],
      live = false,
    ): CapabilityRegistryItemDto => ({
      key,
      priority,
      status,
      title: bnEn(bn, en),
      safeguards,
      live,
    });
    const privacy = bnEn('স্পষ্ট সম্মতি ও সীমিত অ্যাক্সেস', 'Explicit consent and scoped access');
    const verified = bnEn('যাচাইকৃত পরিচয় ও প্রমাণ', 'Verified identity and evidence');
    const legal = bnEn('LEGAL_REVIEW_REQUIRED', 'LEGAL_REVIEW_REQUIRED');
    return [
      item(
        'advisor-network',
        'P1',
        'FOUNDATION_AVAILABLE',
        'যাচাইকৃত উপদেষ্টা নেটওয়ার্ক',
        'Verified advisor network',
        [privacy, verified],
      ),
      item(
        'service-network',
        'P1',
        'FOUNDATION_AVAILABLE',
        'যাচাইকৃত সেবা নেটওয়ার্ক',
        'Verified service network',
        [verified, bnEn('সরকারি/বিনামূল্যের বিকল্প আগে', 'Public/free options first')],
      ),
      item('arrival-mode', 'P1', 'FOUNDATION_AVAILABLE', 'পৌঁছানোর পর সহায়তা', 'Arrival mode', [
        bnEn('দেশভিত্তিক উৎস ও খরচের তারিখ', 'Country sources and dated costs'),
      ]),
      item(
        'journey-learning',
        'P1',
        'FOUNDATION_AVAILABLE',
        'যাত্রাভিত্তিক ছোট শেখা',
        'Journey learning',
        [bnEn('উৎস ও শেষ পর্যালোচনার তারিখ', 'Sources and last-reviewed date')],
      ),
      item(
        'moderated-community',
        'P1',
        'PILOT_ONLY',
        'নিয়ন্ত্রিত কমিউনিটি',
        'Moderated community',
        [verified, bnEn('ফোন/পেমেন্ট/চাকরি ঝুঁকি মডারেশন', 'Phone/payment/job-risk moderation')],
      ),
      item('opportunity-days', 'P1', 'PILOT_ONLY', 'অপরচুনিটি ডে', 'Opportunity Days', [
        verified,
        privacy,
      ]),
      item(
        'finance-insurance-housing',
        'P1',
        'LEGAL_REVIEW_REQUIRED',
        'নিরপেক্ষ সেবা তুলনা',
        'Neutral service comparison',
        [legal, bnEn('ঐচ্ছিক সেবা বাধ্যতামূলক নয়', 'Optional services are not mandatory')],
      ),
      item(
        'official-connectors',
        'P1',
        'EXTERNAL_DEPENDENCY',
        'অনুমোদিত সরকারি কানেক্টর',
        'Authorized government connectors',
        [legal, bnEn('ক্যানোনিক্যাল লিংকই ডিফল্ট', 'Canonical links are the default')],
      ),
      item(
        'assisted-centres',
        'P2',
        'PILOT_ONLY',
        'যাচাইকৃত সহায়তা কেন্দ্র',
        'Verified assisted centres',
        [privacy, bnEn('অটো-লগআউট, অডিট ও রসিদ', 'Auto logout, audit and receipt')],
      ),
      item(
        'return-reintegration',
        'P2',
        'FOUNDATION_AVAILABLE',
        'ফেরা ও পুনঃএকত্রীকরণ',
        'Return and reintegration',
        [bnEn('ব্যবহারকারী নিজের পরবর্তী লক্ষ্য ঠিক করেন', 'The user chooses their next goal')],
      ),
      item(
        'advanced-fraud-network',
        'P2',
        'LEGAL_REVIEW_REQUIRED',
        'উন্নত প্রতারণা বুদ্ধিমত্তা',
        'Advanced fraud intelligence',
        [legal, bnEn('স্বয়ংক্রিয় সিদ্ধান্ত নয়', 'No autonomous fraud decision')],
      ),
      item(
        'regulated-financial-products',
        'P2',
        'EXTERNAL_DEPENDENCY',
        'নিয়ন্ত্রিত আর্থিক পণ্য',
        'Regulated financial products',
        [legal, bnEn('লাইসেন্সপ্রাপ্ত প্রদানকারী দরকার', 'Licensed providers required')],
      ),
    ];
  }

  async caseCommandCenter(subject: Subject, caseId: string) {
    this.requireFeature('unifiedMobilityCore', 'Unified mobility core');
    const mobilityCase = await this.storage.cases.require(caseId);
    if (mobilityCase.ownerUserId !== subject.userId)
      throw new DomainError('FORBIDDEN', 'Case belongs to another user');
    const tasks = await this.storage.caseTasks.list((item) => item.caseId === caseId);
    const deadlines = await this.storage.universalDeadlines.list((item) => item.caseId === caseId);
    const risks = await this.storage.caseRiskFlags.list(
      (item) => item.caseId === caseId && item.status !== 'RESOLVED',
    );
    const costs = await this.storage.costItems.list((item) => item.caseId === caseId);
    const nextTask = tasks.find((task) => ['todo', 'in_progress', 'blocked'].includes(task.status));
    const completed = tasks.filter((task) => task.status === 'done').length;
    return {
      caseId,
      stage: mobilityCase.lifecycleStage ?? mobilityCase.state,
      progress:
        mobilityCase.overallProgress ??
        (tasks.length ? Math.round((completed / tasks.length) * 100) : 0),
      nextAction: mobilityCase.nextAction ?? nextTask?.title ?? null,
      blocker:
        mobilityCase.currentBlocker ?? (nextTask?.status === 'blocked' ? nextTask.title : null),
      today: tasks.filter((task) => task.status !== 'done').slice(0, 3),
      nextDeadline:
        deadlines
          .filter((item) => !item.completedAt)
          .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0] ?? null,
      missingDocuments: tasks.filter(
        (task) => task.status !== 'done' && task.title.en.toLowerCase().includes('document'),
      ),
      openRiskFlags: risks,
      costsDue: costs.filter((item) => ['estimated', 'due'].includes(item.status)),
      waitingOn: nextTask?.owner ?? null,
      changedAt: mobilityCase.updatedAt,
    };
  }
}
