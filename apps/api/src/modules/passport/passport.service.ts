import { Inject, Injectable } from '@nestjs/common';
import {
  assessMigrationPassport,
  buildPreparationPlan,
  rankStudyMatches,
  rankWorkMatches,
  uuidv7,
  type BudgetBand,
  type EducationLevel,
  type HardEligibilityState,
  type MatchFactorState,
  type MigrationPassport,
  type StudyTarget,
} from '@probash/domain';
import type {
  AcademicProfileDto,
  AlertSubscriptionDto,
  AssessmentBundleDto,
  CreateAlertSubscriptionDto,
  MatchRecommendationDto,
  PassportBundleDto,
  RecommendationSetDto,
  UpdateAcademicProfileDto,
  UpdateMigrationPassportDto,
  UpdateWorkProfileDto,
  WorkProfileDto,
} from '@probash/contracts';
import { STORAGE, type Storage } from '../../storage/ports';
import { ClockService } from '../../core/clock.service';
import { AuditService } from '../../core/audit.service';
import { EventOutboxService } from '../../core/event-outbox.service';
import { EligibilityService } from '../eligibility/eligibility.service';
import type {
  AcademicProfileRecord,
  MigrationPassportRecord,
  RecommendationSetRecord,
  WorkProfileRecord,
} from '../../storage/records';

const READINESS_ENGINE_VERSION = 'passport-readiness-v1';
const MATCHING_ENGINE_VERSION = 'transparent-matching-v1';
const PREPARATION_TEMPLATE_VERSION = 'gap-plan-v1';

function highestEducation(profile: AcademicProfileRecord): EducationLevel | undefined {
  const rank: Record<string, number> = {
    secondary: 1,
    higher_secondary: 2,
    vocational: 3,
    diploma: 3,
    bachelor: 4,
    master: 5,
    mphil: 5,
    doctorate: 6,
  };
  const selected = [...profile.education].sort(
    (left, right) => (rank[right.level] ?? 0) - (rank[left.level] ?? 0),
  )[0]?.level;
  if (!selected) return undefined;
  if (selected === 'vocational') return 'diploma';
  if (selected === 'mphil') return 'master';
  return selected;
}

function targetLevel(profile: AcademicProfileRecord): StudyTarget | undefined {
  if (!profile.targetLevel) return undefined;
  if (profile.targetLevel === 'professional') return 'unsure';
  return profile.targetLevel;
}

function budgetBand(value: number | undefined): BudgetBand | undefined {
  if (value === undefined) return undefined;
  if (value < 300_000) return 'under_300k';
  if (value < 800_000) return '300k_800k';
  if (value < 1_500_000) return '800k_1500k';
  return 'over_1500k';
}

function monthsUntil(date: string | undefined, now: Date): number | undefined {
  if (!date) return undefined;
  const timestamp = Date.parse(date);
  if (Number.isNaN(timestamp)) return undefined;
  return Math.max(0, Math.round((timestamp - now.getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
}

function passportStatus(status: MigrationPassportRecord['identity']['passportStatus']) {
  if (!status || status === 'unknown') return undefined;
  return status === 'valid';
}

function readinessPassport(
  shared: MigrationPassportRecord,
  work: WorkProfileRecord,
  study: AcademicProfileRecord,
  now: Date,
): MigrationPassport {
  const hasEducation = study.education.length > 0;
  const hasEmployment = work.employmentHistory.length > 0;
  const english = study.languageEvidence.find(
    (entry) => entry.language.toLowerCase() === 'english',
  );

  return {
    intent: shared.preferences.openness,
    identity: {
      hasPassport: passportStatus(shared.identity.passportStatus),
      passportValidityMonths: shared.identity.passportValidityMonths,
    },
    education: {
      highestLevel: highestEducation(study),
      field: study.education.at(-1)?.field,
      hasCertificates: hasEducation
        ? study.education.some((entry) => entry.certificateDocumentIds.length > 0)
        : study.version > 1
          ? false
          : undefined,
      hasTranscripts: hasEducation
        ? study.education.some((entry) => entry.transcriptDocumentIds.length > 0)
        : study.version > 1
          ? false
          : undefined,
    },
    professional: {
      occupationKnown:
        work.targetOccupationKeys.length > 0 ? true : work.version > 1 ? false : undefined,
      experienceMonths: work.totalExperienceMonths,
      hasExperienceEvidence: hasEmployment
        ? work.employmentHistory.some((entry) => entry.evidenceDocumentIds.length > 0)
        : work.version > 1
          ? false
          : undefined,
      hasSkillCertificate:
        work.credentials.length > 0
          ? work.credentials.some((entry) => entry.kind === 'skill_certificate')
          : work.version > 1
            ? false
            : undefined,
      hasBmetRegistration: work.bmetRegistrationReady,
    },
    study: {
      target: targetLevel(study),
      hasAcademicCv:
        study.academicCvDocumentId !== undefined ? true : study.version > 1 ? false : undefined,
      hasStatement:
        study.statementDocumentId !== undefined ? true : study.version > 1 ? false : undefined,
      hasRecommendations:
        study.recommendationDocumentIds.length > 0 ? true : study.version > 1 ? false : undefined,
      hasResearchProposal:
        study.researchProposalDocumentId !== undefined
          ? true
          : study.version > 1
            ? false
            : undefined,
    },
    language: {
      englishLevel: english?.selfAssessedLevel,
      hasVerifiedTest:
        english?.testName !== undefined
          ? english.evidenceDocumentIds.length > 0
          : study.version > 1
            ? false
            : undefined,
      willingToLearn: shared.preferences.willingToLearnLanguage,
    },
    finance: {
      budgetBand: budgetBand(shared.financial.plannedBudgetBdt),
      proofOfFundsReady: shared.financial.proofOfFundsReady,
      needsScholarship: shared.financial.scholarshipNeeded,
      hasFundingPlan: shared.financial.fundingPlanReady,
    },
    documents: {
      hasPoliceClearance: work.policeClearanceReady,
      hasCv: work.cvDocumentId !== undefined,
    },
    preferences: {
      targetStartMonths: monthsUntil(shared.preferences.targetStartDate, now),
      destinationCountries: shared.preferences.preferredCountries,
      familyImportance:
        shared.preferences.familyReunificationImportance === undefined
          ? undefined
          : shared.preferences.familyReunificationImportance >= 3,
      settlementImportance:
        shared.preferences.permanentResidenceImportance === undefined
          ? undefined
          : shared.preferences.permanentResidenceImportance >= 3,
    },
  };
}

function targetMatchesDegree(target: AcademicProfileRecord['targetLevel'], degree: string) {
  if (!target || target === 'unsure') return 'unknown' as const;
  const normalized = degree.toLowerCase();
  if (target === 'phd') return normalized.includes('phd') || normalized.includes('doctor');
  if (target === 'master') return normalized.includes('master');
  if (target === 'bachelor') return normalized.includes('bachelor');
  return normalized.includes('mba') || normalized.includes('professional');
}

@Injectable()
export class PassportService {
  constructor(
    @Inject(STORAGE) private readonly storage: Storage,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly events: EventOutboxService,
    private readonly eligibility: EligibilityService,
  ) {}

  private emptyShared(userId: string): MigrationPassportRecord {
    const now = this.clock.nowIso();
    return {
      id: uuidv7(),
      userId,
      version: 1,
      identity: { identityVerificationStatus: 'unverified' },
      financial: {},
      preferences: { openness: 'unsure', preferredCountries: [], excludedCountries: [] },
      documentIds: [],
      consentIds: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  private emptyWork(userId: string): WorkProfileRecord {
    return {
      id: uuidv7(),
      userId,
      version: 1,
      targetOccupationKeys: [],
      employmentHistory: [],
      technicalSkills: [],
      credentials: [],
      portfolioUrls: [],
      updatedAt: this.clock.nowIso(),
    };
  }

  private emptyStudy(userId: string): AcademicProfileRecord {
    return {
      id: uuidv7(),
      userId,
      version: 1,
      targetFields: [],
      education: [],
      transcriptCourses: [],
      languageEvidence: [],
      academicGaps: [],
      researchInterests: [],
      publications: [],
      portfolioUrls: [],
      recommendationDocumentIds: [],
      updatedAt: this.clock.nowIso(),
    };
  }

  async getBundle(userId: string): Promise<PassportBundleDto> {
    let shared = await this.storage.migrationPassports.find((entry) => entry.userId === userId);
    let work = await this.storage.workProfiles.find((entry) => entry.userId === userId);
    let study = await this.storage.academicProfiles.find((entry) => entry.userId === userId);
    if (!shared) shared = await this.storage.migrationPassports.put(this.emptyShared(userId));
    if (!work) work = await this.storage.workProfiles.put(this.emptyWork(userId));
    if (!study) study = await this.storage.academicProfiles.put(this.emptyStudy(userId));
    return { shared, work, study };
  }

  async updateShared(
    userId: string,
    patch: UpdateMigrationPassportDto,
  ): Promise<MigrationPassportRecord> {
    const { shared } = await this.getBundle(userId);
    const updated: MigrationPassportRecord = {
      ...shared,
      version: shared.version + 1,
      identity: { ...shared.identity, ...patch.identity },
      financial: { ...shared.financial, ...patch.financial },
      preferences: { ...shared.preferences, ...patch.preferences },
      documentIds: patch.documentIds ?? shared.documentIds,
      updatedAt: this.clock.nowIso(),
    };
    await this.storage.migrationPassports.put(updated);
    await this.recordUpdate(userId, 'migration_passport', updated.id, Object.keys(patch));
    return updated;
  }

  async updateWork(userId: string, patch: UpdateWorkProfileDto): Promise<WorkProfileDto> {
    const { work } = await this.getBundle(userId);
    const updated: WorkProfileRecord = {
      ...work,
      ...patch,
      version: work.version + 1,
      targetOccupationKeys: patch.targetOccupationKeys ?? work.targetOccupationKeys,
      employmentHistory: patch.employmentHistory ?? work.employmentHistory,
      technicalSkills: patch.technicalSkills ?? work.technicalSkills,
      credentials: patch.credentials ?? work.credentials,
      portfolioUrls: patch.portfolioUrls ?? work.portfolioUrls,
      updatedAt: this.clock.nowIso(),
    };
    await this.storage.workProfiles.put(updated);

    const legacy = await this.storage.profiles.find((entry) => entry.userId === userId);
    if (legacy) {
      await this.storage.profiles.put({
        ...legacy,
        occupationKey: updated.targetOccupationKeys[0] ?? updated.currentOccupationKey,
        experienceMonths: updated.totalExperienceMonths,
        hasBmetRegistration: updated.bmetRegistrationReady,
        hasPoliceClearance: updated.policeClearanceReady,
        skillCertificates: updated.credentials.map((entry) => entry.title),
        medicallyFit: updated.medicallyFit,
        updatedAt: this.clock.nowIso(),
      });
    }

    await this.recordUpdate(userId, 'work_profile', updated.id, Object.keys(patch));
    return updated;
  }

  async updateStudy(userId: string, patch: UpdateAcademicProfileDto): Promise<AcademicProfileDto> {
    const { study } = await this.getBundle(userId);
    const updated: AcademicProfileRecord = {
      ...study,
      ...patch,
      version: study.version + 1,
      targetFields: patch.targetFields ?? study.targetFields,
      education: patch.education ?? study.education,
      transcriptCourses: patch.transcriptCourses ?? study.transcriptCourses,
      languageEvidence: patch.languageEvidence ?? study.languageEvidence,
      academicGaps: patch.academicGaps ?? study.academicGaps,
      researchInterests: patch.researchInterests ?? study.researchInterests,
      publications: patch.publications ?? study.publications,
      portfolioUrls: patch.portfolioUrls ?? study.portfolioUrls,
      recommendationDocumentIds: patch.recommendationDocumentIds ?? study.recommendationDocumentIds,
      updatedAt: this.clock.nowIso(),
    };
    await this.storage.academicProfiles.put(updated);

    const legacy = await this.storage.profiles.find((entry) => entry.userId === userId);
    if (legacy) {
      await this.storage.profiles.put({
        ...legacy,
        educationLevel: highestEducation(updated),
        languageCertificates: updated.languageEvidence
          .filter((entry) => entry.testName)
          .map((entry) => `${entry.testName}:${entry.overallScore ?? entry.level ?? 'recorded'}`),
        updatedAt: this.clock.nowIso(),
      });
    }

    await this.recordUpdate(userId, 'academic_profile', updated.id, Object.keys(patch));
    return updated;
  }

  private async recordUpdate(
    userId: string,
    resourceType: string,
    resourceId: string,
    fields: string[],
  ) {
    await this.audit.record({
      actorUserId: userId,
      action: `${resourceType}.updated`,
      resourceType,
      resourceId,
      metadata: { fields: fields.join(',') },
    });
    await this.events.publish(
      'PassportProfileUpdated',
      { resourceType, fieldCount: fields.length },
      { actorRef: userId },
    );
  }

  async assess(userId: string): Promise<AssessmentBundleDto> {
    const bundle = await this.getBundle(userId);
    const input = readinessPassport(bundle.shared, bundle.work, bundle.study, this.clock.now());
    const workAssessment = assessMigrationPassport(input, 'work');
    const studyAssessment = assessMigrationPassport(input, 'study');
    const createdAt = this.clock.nowIso();

    const saveAssessment = async (assessment: typeof workAssessment, profileVersion: number) => {
      const record = {
        id: uuidv7(),
        userId,
        path: assessment.path,
        passportVersion: bundle.shared.version,
        profileVersion,
        engineVersion: READINESS_ENGINE_VERSION,
        outcome: assessment.outcome,
        readinessPercent: assessment.readinessPercent,
        evidenceCoveragePercent: assessment.evidenceCoveragePercent,
        factors: assessment.factors,
        sourceIds: [],
        createdAt,
      };
      return this.storage.readinessAssessments.put(record);
    };

    const [work, study] = await Promise.all([
      saveAssessment(workAssessment, bundle.work.version),
      saveAssessment(studyAssessment, bundle.study.version),
    ]);

    const tasks = [];
    for (const assessment of [work, study]) {
      for (const task of buildPreparationPlan(
        assessment.path === 'work' ? workAssessment : studyAssessment,
      )) {
        tasks.push(
          await this.storage.preparationTasks.put({
            id: uuidv7(),
            userId,
            assessmentId: assessment.id,
            path: task.path,
            dimension: task.dimension,
            state: task.state,
            priority: task.priority,
            labelKey: task.labelKey,
            actionKey: task.actionKey,
            needsRouteEvidence: task.needsRouteEvidence,
            sourceIds: [],
            templateVersion: PREPARATION_TEMPLATE_VERSION,
            status: 'open',
            createdAt,
          }),
        );
      }
    }

    await this.events.publish(
      'PassportReadinessAssessed',
      {
        workOutcome: work.outcome,
        studyOutcome: study.outcome,
        taskCount: tasks.length,
      },
      { actorRef: userId },
    );
    return { work, study, tasks };
  }

  private preferenceState(shared: MigrationPassportRecord, countryCode: string): MatchFactorState {
    if (shared.preferences.excludedCountries.includes(countryCode)) return 'gap';
    if (shared.preferences.preferredCountries.includes(countryCode)) return 'fit';
    return 'unknown';
  }

  private readinessState(percent: number, coverage: number): MatchFactorState {
    if (coverage < 35) return 'unknown';
    return percent >= 65 ? 'fit' : 'gap';
  }

  async match(userId: string): Promise<RecommendationSetDto> {
    const bundle = await this.getBundle(userId);
    const latestAssessment = await this.assess(userId);
    const legacyProfile = await this.storage.profiles.find((entry) => entry.userId === userId);
    const routes = await this.storage.routeVersions.list(
      (entry) => entry.publicationStatus === 'published',
    );
    const jobs = await this.storage.jobs.list((entry) => entry.publicationStatus === 'published');

    const workCandidates = [];
    for (const route of routes.filter((entry) => entry.purpose !== 'study')) {
      const routeJobs = jobs.filter((job) => job.routeVersionId === route.id);
      const targets = bundle.work.targetOccupationKeys;
      const occupationFit: MatchFactorState =
        targets.length === 0
          ? 'unknown'
          : routeJobs.length === 0
            ? 'unknown'
            : routeJobs.some((job) =>
                  targets.some((target) => job.occupationId === `occ_${target}`),
                )
              ? 'fit'
              : 'gap';
      const eligibility = await this.eligibility.evaluateForProfile(
        legacyProfile,
        { routeVersionId: route.id },
        userId,
      );
      const feeRules = await this.storage.feeRules.list(
        (fee) => fee.routeId === route.routeId || fee.routeId === '*',
      );
      const resolvableFees = feeRules.filter(
        (fee) => fee.amount.currency === 'BDT' && !fee.unresolved,
      );
      const totalFeeBdt = resolvableFees.reduce(
        (sum, fee) => sum + Number(BigInt(fee.amount.minorUnits)) / 100,
        0,
      );
      const economicsFit: MatchFactorState =
        bundle.shared.financial.plannedBudgetBdt === undefined || resolvableFees.length === 0
          ? 'unknown'
          : totalFeeBdt <= bundle.shared.financial.plannedBudgetBdt
            ? 'fit'
            : 'gap';

      workCandidates.push({
        candidateId: route.id,
        path: 'work' as const,
        routeVersionId: route.id,
        countryCode: route.destinationCountry,
        hardEligibility: eligibility.trace.result as HardEligibilityState,
        jobIds: routeJobs.map((job) => job.id),
        factors: [
          { key: 'work.occupation_fit', state: occupationFit, weight: 25 },
          {
            key: 'work.readiness_fit',
            state: this.readinessState(
              latestAssessment.work.readinessPercent,
              latestAssessment.work.evidenceCoveragePercent,
            ),
            weight: 30,
          },
          {
            key: 'work.economics_fit',
            state: economicsFit,
            weight: 25,
            sourceIds: feeRules.flatMap((fee) => fee.sourceIds),
          },
          {
            key: 'work.preference_fit',
            state: this.preferenceState(bundle.shared, route.destinationCountry),
            weight: 20,
          },
        ],
        sourceIds: [...route.sourceIds, ...eligibility.sources.map((source) => source.id)],
        dataStatus: route.isSyntheticDemoData
          ? ('synthetic_demo' as const)
          : route.verifiedBy.startsWith('research:not-human')
            ? ('review_required' as const)
            : ('verified' as const),
      });
    }

    const institutions = await this.storage.institutions.list();
    const courses = await this.storage.courses.list();
    const studyCandidates = courses.map((course) => {
      const institution = institutions.find((entry) => entry.id === course.institutionId);
      const levelFit = targetMatchesDegree(bundle.study.targetLevel, course.degreeLevel);
      const academicFit: MatchFactorState =
        levelFit === 'unknown' ? 'unknown' : levelFit ? 'fit' : 'gap';
      const fundingFit: MatchFactorState =
        bundle.shared.financial.plannedBudgetBdt === undefined || course.tuition.currency !== 'BDT'
          ? 'unknown'
          : Number(BigInt(course.tuition.minorUnits)) / 100 <=
              bundle.shared.financial.plannedBudgetBdt
            ? 'fit'
            : 'gap';
      return {
        candidateId: course.id,
        path: 'study' as const,
        programId: course.id,
        institutionId: course.institutionId,
        countryCode: institution?.countryCode ?? 'XX',
        hardEligibility: 'unknown' as const,
        factors: [
          { key: 'study.academic_fit', state: academicFit, weight: 30 },
          {
            key: 'study.readiness_fit',
            state: this.readinessState(
              latestAssessment.study.readinessPercent,
              latestAssessment.study.evidenceCoveragePercent,
            ),
            weight: 25,
          },
          { key: 'study.funding_fit', state: fundingFit, weight: 25 },
          {
            key: 'study.preference_fit',
            state: this.preferenceState(bundle.shared, institution?.countryCode ?? 'XX'),
            weight: 10,
          },
          {
            key: 'study.program_prerequisites',
            state: 'unknown' as const,
            weight: 10,
            sourceIds: course.sourceIds,
          },
        ],
        sourceIds: course.sourceIds,
        dataStatus: course.isSyntheticDemoData
          ? ('synthetic_demo' as const)
          : institution?.lastVerifiedAt
            ? ('verified' as const)
            : ('review_required' as const),
      };
    });

    const workById = new Map(routes.map((route) => [route.id, route]));
    const studyById = new Map(courses.map((course) => [course.id, course]));
    const work: MatchRecommendationDto[] = rankWorkMatches(workCandidates).map((match) => {
      const route = workById.get(match.candidateId)!;
      return { ...match, title: route.officialName };
    });
    const study: MatchRecommendationDto[] = rankStudyMatches(studyCandidates).map((match) => {
      const course = studyById.get(match.candidateId)!;
      const institution = institutions.find((entry) => entry.id === course.institutionId);
      return { ...match, title: course.title, provider: institution?.legalName };
    });

    const record: RecommendationSetRecord = {
      id: uuidv7(),
      userId,
      passportVersion: bundle.shared.version,
      engineVersion: MATCHING_ENGINE_VERSION,
      work,
      study,
      comparison: { genericWinner: null, noteKey: 'passport.comparisonNote' },
      createdAt: this.clock.nowIso(),
    };
    await this.storage.recommendations.put(record);
    await this.events.publish(
      'PassportMatchesGenerated',
      { workCount: work.length, studyCount: study.length },
      { actorRef: userId },
    );
    return record;
  }

  async history(userId: string) {
    const [assessments, tasks, recommendations] = await Promise.all([
      this.storage.readinessAssessments.list((entry) => entry.userId === userId),
      this.storage.preparationTasks.list((entry) => entry.userId === userId),
      this.storage.recommendations.list((entry) => entry.userId === userId),
    ]);
    return {
      assessments: assessments.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      tasks: tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      recommendations: recommendations.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }

  async listAlerts(userId: string): Promise<AlertSubscriptionDto[]> {
    return this.storage.alertSubscriptions.list((entry) => entry.userId === userId);
  }

  async createAlert(
    userId: string,
    input: CreateAlertSubscriptionDto,
  ): Promise<AlertSubscriptionDto> {
    const now = this.clock.nowIso();
    const record: AlertSubscriptionDto = {
      id: uuidv7(),
      userId,
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    await this.storage.alertSubscriptions.put(record);
    await this.audit.record({
      actorUserId: userId,
      action: 'alert_subscription.created',
      resourceType: 'alert_subscription',
      resourceId: record.id,
    });
    return record;
  }

  async removeAlert(userId: string, alertId: string): Promise<void> {
    const alert = await this.storage.alertSubscriptions.require(alertId);
    if (alert.userId !== userId) return;
    await this.storage.alertSubscriptions.remove(alertId);
    await this.audit.record({
      actorUserId: userId,
      action: 'alert_subscription.removed',
      resourceType: 'alert_subscription',
      resourceId: alertId,
    });
  }
}
