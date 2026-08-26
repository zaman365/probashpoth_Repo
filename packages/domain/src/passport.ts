/**
 * Migration Passport + readiness engine.
 *
 * This module deliberately evaluates preparation evidence, not visa, job, or
 * admission eligibility. Hard eligibility remains route/program specific and must be
 * decided by the versioned rules engine. Unknown facts stay unknown.
 */

export type JourneyPath = 'work' | 'study';
export type JourneyIntent = JourneyPath | 'both' | 'unsure';

export type EducationLevel =
  'secondary' | 'higher_secondary' | 'diploma' | 'bachelor' | 'master' | 'doctorate';

export type StudyTarget = 'bachelor' | 'master' | 'phd' | 'unsure';
export type LanguageLevel = 'none' | 'basic' | 'intermediate' | 'advanced';
export type BudgetBand = 'under_300k' | '300k_800k' | '800k_1500k' | 'over_1500k';

export interface MigrationPassport {
  intent: JourneyIntent;
  identity: {
    hasPassport?: boolean;
    passportValidityMonths?: number;
  };
  education: {
    highestLevel?: EducationLevel;
    field?: string;
    hasCertificates?: boolean;
    hasTranscripts?: boolean;
  };
  professional: {
    occupationKnown?: boolean;
    experienceMonths?: number;
    hasExperienceEvidence?: boolean;
    hasSkillCertificate?: boolean;
    hasBmetRegistration?: boolean;
  };
  study: {
    target?: StudyTarget;
    hasAcademicCv?: boolean;
    hasStatement?: boolean;
    hasRecommendations?: boolean;
    hasResearchProposal?: boolean;
  };
  language: {
    englishLevel?: LanguageLevel;
    hasVerifiedTest?: boolean;
    willingToLearn?: boolean;
  };
  finance: {
    budgetBand?: BudgetBand;
    proofOfFundsReady?: boolean;
    needsScholarship?: boolean;
    hasFundingPlan?: boolean;
  };
  documents: {
    hasPoliceClearance?: boolean;
    hasCv?: boolean;
  };
  preferences: {
    targetStartMonths?: number;
    destinationCountries: string[];
    familyImportance?: boolean;
    settlementImportance?: boolean;
  };
}

export type ReadinessState = 'ready' | 'missing' | 'unknown';

export type ReadinessDimension =
  | 'identity'
  | 'documents'
  | 'financial'
  | 'language'
  | 'deadline'
  | 'legal'
  | 'occupation'
  | 'experience'
  | 'skills'
  | 'academic'
  | 'prerequisites'
  | 'application_materials'
  | 'funding';

export interface ReadinessFactor {
  id: string;
  path: JourneyPath;
  dimension: ReadinessDimension;
  state: ReadinessState;
  weight: number;
  /** Human-readable copy resolves from this key in the UI. */
  labelKey: string;
  actionKey: string;
  /** True when a route/program or official source must decide the answer. */
  needsRouteEvidence: boolean;
}

export type ReadinessOutcome = 'ready' | 'near_ready' | 'needs_preparation' | 'needs_review';

export interface ReadinessAssessment {
  path: JourneyPath;
  outcome: ReadinessOutcome;
  /** Prepared share of all factors. Unknowns are not silently converted to failures. */
  readinessPercent: number;
  /** Share of factor weight for which the user supplied a determinate answer. */
  evidenceCoveragePercent: number;
  factors: ReadinessFactor[];
  ready: ReadinessFactor[];
  missing: ReadinessFactor[];
  unknown: ReadinessFactor[];
}

export interface PreparationTask {
  id: string;
  path: JourneyPath;
  dimension: ReadinessDimension;
  state: Exclude<ReadinessState, 'ready'>;
  priority: 'now' | 'next' | 'confirm';
  labelKey: string;
  actionKey: string;
  needsRouteEvidence: boolean;
}

export interface JourneyComparison {
  work: ReadinessAssessment;
  study: ReadinessAssessment;
  currentlyMorePrepared: JourneyPath | 'balanced' | 'insufficient_data';
}

function booleanState(value: boolean | undefined): ReadinessState {
  return value === undefined ? 'unknown' : value ? 'ready' : 'missing';
}

function factor(
  path: JourneyPath,
  id: string,
  dimension: ReadinessDimension,
  state: ReadinessState,
  weight: number,
  needsRouteEvidence = false,
): ReadinessFactor {
  return {
    id,
    path,
    dimension,
    state,
    weight,
    labelKey: `passport.factor.${id}`,
    actionKey: `passport.action.${id}`,
    needsRouteEvidence,
  };
}

function passportState(passport: MigrationPassport): ReadinessState {
  if (passport.identity.hasPassport === undefined) return 'unknown';
  if (!passport.identity.hasPassport) return 'missing';
  if (passport.identity.passportValidityMonths === undefined) return 'unknown';
  return passport.identity.passportValidityMonths >= 12 ? 'ready' : 'missing';
}

function deadlineState(months: number | undefined): ReadinessState {
  if (months === undefined) return 'unknown';
  return months >= 6 ? 'ready' : 'missing';
}

const EDUCATION_RANK: Record<EducationLevel, number> = {
  secondary: 1,
  higher_secondary: 2,
  diploma: 3,
  bachelor: 4,
  master: 5,
  doctorate: 6,
};

function academicLevelState(passport: MigrationPassport): ReadinessState {
  const target = passport.study.target;
  const level = passport.education.highestLevel;
  if (!target || target === 'unsure' || !level) return 'unknown';
  const required = target === 'bachelor' ? 2 : target === 'master' ? 4 : 5;
  return EDUCATION_RANK[level] >= required ? 'ready' : 'missing';
}

function workFactors(passport: MigrationPassport): ReadinessFactor[] {
  const hasExperience = passport.professional.experienceMonths;
  const experienceState: ReadinessState =
    hasExperience === undefined
      ? 'unknown'
      : hasExperience > 0
        ? booleanState(passport.professional.hasExperienceEvidence)
        : 'missing';

  const languageProfileState: ReadinessState =
    passport.language.englishLevel === undefined
      ? 'unknown'
      : passport.language.englishLevel === 'none' && !passport.language.willingToLearn
        ? 'missing'
        : 'ready';

  return [
    factor('work', 'valid_passport', 'identity', passportState(passport), 12),
    factor(
      'work',
      'education_evidence',
      'documents',
      booleanState(passport.education.hasCertificates),
      7,
    ),
    factor(
      'work',
      'occupation_selected',
      'occupation',
      booleanState(passport.professional.occupationKnown),
      12,
    ),
    factor('work', 'experience_evidence', 'experience', experienceState, 11),
    factor(
      'work',
      'skill_certificate',
      'skills',
      booleanState(passport.professional.hasSkillCertificate),
      8,
      true,
    ),
    factor('work', 'language_profile', 'language', languageProfileState, 10, true),
    factor(
      'work',
      'migration_budget',
      'financial',
      passport.finance.budgetBand ? 'ready' : 'unknown',
      8,
      true,
    ),
    factor(
      'work',
      'bmet_registration',
      'legal',
      booleanState(passport.professional.hasBmetRegistration),
      10,
      true,
    ),
    factor(
      'work',
      'police_clearance',
      'documents',
      booleanState(passport.documents.hasPoliceClearance),
      7,
      true,
    ),
    factor(
      'work',
      'start_timeline',
      'deadline',
      deadlineState(passport.preferences.targetStartMonths),
      7,
    ),
    factor('work', 'route_specific_work_rules', 'legal', 'unknown', 8, true),
  ];
}

function studyFactors(passport: MigrationPassport): ReadinessFactor[] {
  const researchProposalState: ReadinessState =
    passport.study.target === 'phd'
      ? booleanState(passport.study.hasResearchProposal)
      : passport.study.target
        ? 'ready'
        : 'unknown';

  const fundingState: ReadinessState = passport.finance.needsScholarship
    ? booleanState(passport.finance.hasFundingPlan)
    : passport.finance.needsScholarship === false
      ? passport.finance.budgetBand
        ? 'ready'
        : 'unknown'
      : 'unknown';

  return [
    factor('study', 'valid_passport', 'identity', passportState(passport), 10),
    factor('study', 'academic_level', 'academic', academicLevelState(passport), 13, true),
    factor(
      'study',
      'academic_certificates',
      'documents',
      booleanState(passport.education.hasCertificates),
      7,
    ),
    factor(
      'study',
      'academic_transcripts',
      'documents',
      booleanState(passport.education.hasTranscripts),
      10,
    ),
    factor(
      'study',
      'verified_language_test',
      'language',
      booleanState(passport.language.hasVerifiedTest),
      11,
      true,
    ),
    factor(
      'study',
      'academic_cv',
      'application_materials',
      booleanState(passport.study.hasAcademicCv),
      7,
    ),
    factor(
      'study',
      'statement',
      'application_materials',
      booleanState(passport.study.hasStatement),
      7,
      true,
    ),
    factor(
      'study',
      'recommendations',
      'application_materials',
      booleanState(passport.study.hasRecommendations),
      6,
      true,
    ),
    factor('study', 'research_proposal', 'application_materials', researchProposalState, 6, true),
    factor('study', 'funding_plan', 'funding', fundingState, 10, true),
    factor(
      'study',
      'proof_of_funds',
      'financial',
      booleanState(passport.finance.proofOfFundsReady),
      8,
      true,
    ),
    factor(
      'study',
      'start_timeline',
      'deadline',
      deadlineState(passport.preferences.targetStartMonths),
      6,
    ),
    factor('study', 'program_prerequisites', 'prerequisites', 'unknown', 9, true),
  ];
}

export function assessMigrationPassport(
  passport: MigrationPassport,
  path: JourneyPath,
): ReadinessAssessment {
  const factors = path === 'work' ? workFactors(passport) : studyFactors(passport);
  const totalWeight = factors.reduce((sum, item) => sum + item.weight, 0);
  const readyWeight = factors
    .filter((item) => item.state === 'ready')
    .reduce((sum, item) => sum + item.weight, 0);
  const knownWeight = factors
    .filter((item) => item.state !== 'unknown')
    .reduce((sum, item) => sum + item.weight, 0);
  const missingWeight = factors
    .filter((item) => item.state === 'missing')
    .reduce((sum, item) => sum + item.weight, 0);
  const unknownWeight = totalWeight - knownWeight;
  const readinessPercent = totalWeight === 0 ? 0 : Math.round((readyWeight / totalWeight) * 100);
  const evidenceCoveragePercent =
    totalWeight === 0 ? 0 : Math.round((knownWeight / totalWeight) * 100);

  const outcome: ReadinessOutcome =
    missingWeight === 0 && unknownWeight === 0
      ? 'ready'
      : missingWeight === 0
        ? 'needs_review'
        : readinessPercent >= 58
          ? 'near_ready'
          : 'needs_preparation';

  return {
    path,
    outcome,
    readinessPercent,
    evidenceCoveragePercent,
    factors,
    ready: factors.filter((item) => item.state === 'ready'),
    missing: factors.filter((item) => item.state === 'missing'),
    unknown: factors.filter((item) => item.state === 'unknown'),
  };
}

export function buildPreparationPlan(assessment: ReadinessAssessment): PreparationTask[] {
  return assessment.factors
    .filter(
      (item): item is ReadinessFactor & { state: 'missing' | 'unknown' } =>
        item.state === 'missing' || item.state === 'unknown',
    )
    .sort((left, right) => {
      if (left.state !== right.state) return left.state === 'missing' ? -1 : 1;
      return right.weight - left.weight;
    })
    .map((item, index) => ({
      id: `${assessment.path}:${item.id}`,
      path: assessment.path,
      dimension: item.dimension,
      state: item.state,
      priority:
        item.state === 'unknown' ? 'confirm' : index < 3 || item.weight >= 10 ? 'now' : 'next',
      labelKey: item.labelKey,
      actionKey: item.actionKey,
      needsRouteEvidence: item.needsRouteEvidence,
    }));
}

export function compareJourneyReadiness(passport: MigrationPassport): JourneyComparison {
  const work = assessMigrationPassport(passport, 'work');
  const study = assessMigrationPassport(passport, 'study');
  const enoughEvidence = work.evidenceCoveragePercent >= 35 || study.evidenceCoveragePercent >= 35;
  const difference = work.readinessPercent - study.readinessPercent;

  return {
    work,
    study,
    currentlyMorePrepared: !enoughEvidence
      ? 'insufficient_data'
      : Math.abs(difference) < 8
        ? 'balanced'
        : difference > 0
          ? 'work'
          : 'study',
  };
}
