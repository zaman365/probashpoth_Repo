import type { LocalizedText } from './localized';
import type { MoneyJson } from './money';

/** Unified guide §2/§6 — one core, with equal Work and Study products. */
export type MobilityGoal = 'WORK' | 'STUDY' | 'TRAINING' | 'EXPLORE';

export type MobilityLifecycleStage =
  | 'DISCOVER'
  | 'QUALIFY'
  | 'PREPARE'
  | 'VERIFY'
  | 'APPLY'
  | 'VISA'
  | 'DEPART'
  | 'ARRIVE'
  | 'SETTLE'
  | 'GROW'
  | 'RETURN_OR_NEXT_MOVE';

/** §10.5 — an honest support statement, not a marketing coverage claim. */
export type CoverageMaturity =
  | 'RESEARCH_ONLY'
  | 'INFORMATION_VERIFIED'
  | 'ELIGIBILITY_SUPPORTED'
  | 'JOURNEY_SUPPORTED'
  | 'PARTNER_SUPPORTED'
  | 'TRANSACTION_SUPPORTED';

export const COVERAGE_ORDER: readonly CoverageMaturity[] = [
  'RESEARCH_ONLY',
  'INFORMATION_VERIFIED',
  'ELIGIBILITY_SUPPORTED',
  'JOURNEY_SUPPORTED',
  'PARTNER_SUPPORTED',
  'TRANSACTION_SUPPORTED',
] as const;

export function coverageAtLeast(actual: CoverageMaturity, required: CoverageMaturity): boolean {
  return COVERAGE_ORDER.indexOf(actual) >= COVERAGE_ORDER.indexOf(required);
}

/** §19.4 — a vacancy is never presented as accessible merely because it is public. */
export type BangladeshAccessibility =
  | 'CONFIRMED_OPEN_TO_BANGLADESH'
  | 'INTERNATIONAL_SPONSORSHIP_INDICATED'
  | 'POTENTIALLY_ELIGIBLE'
  | 'LOCAL_WORK_AUTHORIZATION_REQUIRED'
  | 'NOT_CONFIRMED'
  | 'NOT_ELIGIBLE';

export interface RouteCoverage {
  id: string;
  routeVersionId: string;
  countryCode: string;
  nationalityScope: string[];
  maturity: CoverageMaturity;
  officialInformationAvailable: boolean;
  eligibilityEngineAvailable: boolean;
  applicationGuidanceAvailable: boolean;
  verifiedPartnerAvailable: boolean;
  officialFeeDataAvailable: boolean;
  processingTimeDataAvailable: boolean;
  sourceLastVerifiedAt?: string;
  coverageOwner?: string;
  checklist: {
    officialSourcesMapped: boolean;
    visaRoutesMapped: boolean;
    costsMapped: boolean;
    recognitionMapped: boolean;
    languageMapped: boolean;
    opportunitiesMapped: boolean;
    providerVerificationAvailable: boolean;
    complaintAndEmergencySourcesMapped: boolean;
    arrivalTasksMapped: boolean;
    contentReviewed: boolean;
    legalReviewComplete: boolean;
    dataOwnerAssigned: boolean;
    freshnessSlaConfigured: boolean;
  };
  updatedAt: string;
}

export type SourceTrustTier =
  | 'TIER_1_OFFICIAL'
  | 'TIER_2_REGULATOR_OR_PUBLIC_BODY'
  | 'TIER_3_INSTITUTION_OR_EMPLOYER'
  | 'TIER_4_VERIFIED_PARTNER'
  | 'TIER_5_SECONDARY_REFERENCE';

export type SourceStatus = 'ACTIVE' | 'STALE' | 'UNAVAILABLE' | 'REPLACED' | 'REVIEW_REQUIRED';

export type OfficialActionType =
  | 'BMET_REGISTRATION'
  | 'AGENCY_VERIFICATION'
  | 'VISA_VERIFICATION'
  | 'EMIGRATION_CLEARANCE'
  | 'OFFICIAL_COMPLAINT'
  | 'BOESL_APPLICATION'
  | 'GOVERNMENT_TRAINING'
  | 'DESTINATION_VISA_APPLICATION'
  | 'QUALIFICATION_RECOGNITION'
  | 'OTHER';

/** §4.1 — explains and tracks an official handoff without impersonating the authority. */
export interface OfficialAction {
  id: string;
  countryCode: string;
  authority: LocalizedText;
  actionType: OfficialActionType;
  title: LocalizedText;
  description: LocalizedText;
  officialUrl: string;
  officialAppDeeplink?: string;
  isExternal: true;
  requiresAccount: boolean;
  requiresInPerson: boolean;
  feeType: 'OFFICIAL' | 'FREE' | 'VARIES' | 'UNKNOWN';
  officialFee?: MoneyJson;
  sourceRecordId: string;
  lastVerifiedAt?: string;
  status: 'ACTIVE' | 'TEMPORARILY_UNAVAILABLE' | 'RETIRED' | 'NEEDS_REVIEW';
  preparationRequirementIds: string[];
  legalReviewRequired: boolean;
}

export interface OfficialActionCompletion {
  id: string;
  actionId: string;
  userId: string;
  caseId?: string;
  status: 'NOT_STARTED' | 'HANDED_OFF' | 'USER_CONFIRMED_COMPLETE' | 'AUTHORIZED_SYNC_COMPLETE';
  handedOffAt?: string;
  userConfirmedAt?: string;
  authorizedExternalReference?: string;
  /** Never interpreted as an authority-issued status unless an authorized connector supplied it. */
  statusProvenance: 'USER_CONFIRMED' | 'AUTHORIZED_CONNECTOR' | 'NONE';
  updatedAt: string;
}

export type FeeResponsibility =
  'EMPLOYER' | 'WORKER' | 'GOVERNMENT' | 'SHARED' | 'OPTIONAL_USER_SERVICE' | 'UNKNOWN';

export type CostDisclosureKind = 'OFFICIAL' | 'PROVIDER' | 'OPTIONAL' | 'PLATFORM' | 'UNKNOWN';

export interface TransparentCostItem {
  id: string;
  label: LocalizedText;
  amount?: MoneyJson;
  amountStatus: 'EXACT' | 'RANGE' | 'ESTIMATED' | 'UNKNOWN';
  minAmount?: MoneyJson;
  maxAmount?: MoneyJson;
  disclosureKind: CostDisclosureKind;
  responsibility: FeeResponsibility;
  chargedBy?: LocalizedText;
  mandatory: boolean;
  legallyAllowed: boolean | null;
  workerPaidWarning: boolean;
  refundable: boolean | null;
  sourceIds: string[];
  lastVerifiedAt?: string;
}

export type DeadlineKind =
  | 'SCHOLARSHIP'
  | 'UNIVERSITY'
  | 'JOB'
  | 'APPLICATION'
  | 'VISA'
  | 'BIOMETRICS'
  | 'MEDICAL'
  | 'TRAINING'
  | 'LANGUAGE_EXAM'
  | 'DOCUMENT_EXPIRY'
  | 'CONTRACT'
  | 'DEPARTURE'
  | 'ARRIVAL'
  | 'RESIDENCE_RENEWAL';

export interface UniversalDeadline {
  id: string;
  ownerUserId?: string;
  caseId?: string;
  opportunityId?: string;
  entityType: string;
  entityId: string;
  kind: DeadlineKind;
  title: LocalizedText;
  dueAt: string;
  timezone: string;
  hardness: 'HARD' | 'SOFT';
  reminderOffsetsMinutes: number[];
  completedAt?: string;
  sourceIds: string[];
  changedFromDeadlineId?: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationCategory =
  | 'JOURNEY_TASK'
  | 'DOCUMENT'
  | 'DEADLINE'
  | 'APPLICATION'
  | 'VISA'
  | 'APPOINTMENT'
  | 'PROVIDER_MESSAGE'
  | 'OFFICIAL_RULE_CHANGE'
  | 'OPPORTUNITY'
  | 'SCHOLARSHIP'
  | 'JOB'
  | 'INTERVIEW'
  | 'PAYMENT'
  | 'SECURITY'
  | 'FRAUD_WARNING'
  | 'ARRIVAL'
  | 'RENEWAL'
  | 'COMMUNITY'
  | 'RETURN';

export interface PrivacySafeNotification {
  id: string;
  userId: string;
  category: NotificationCategory;
  priority: 'URGENT' | 'ACTION_NEEDED' | 'INFORMATION' | 'MARKETING';
  title: LocalizedText;
  /** Must not contain passport, NID, medical, financial, or raw case details. */
  safePreview: LocalizedText;
  deepLink?: string;
  marketingConsentRequired: boolean;
  createdAt: string;
  readAt?: string;
}

export type SavedItemType =
  | 'PROGRAM'
  | 'JOB'
  | 'EMPLOYER'
  | 'INSTITUTION'
  | 'PATHWAY'
  | 'SCHOLARSHIP'
  | 'TRAINING'
  | 'PROVIDER';

export interface SavedItem {
  id: string;
  userId: string;
  itemType: SavedItemType;
  itemId: string;
  state: 'SAVED' | 'SHORTLISTED' | 'DISMISSED';
  compare: boolean;
  note?: string;
  delegateShareIds: string[];
  alertPreference: 'NONE' | 'DEADLINES' | 'ALL_UPDATES';
  createdAt: string;
  updatedAt: string;
}

export type UnifiedApplicationStatus =
  | 'DRAFT'
  | 'PROFILE_INCOMPLETE'
  | 'DOCS_INCOMPLETE'
  | 'ELIGIBILITY_REVIEW'
  | 'QA_REVIEW'
  | 'USER_APPROVAL_REQUIRED'
  | 'READY_TO_SUBMIT'
  | 'SUBMITTED'
  | 'PROVIDER_REVIEW'
  | 'ACTION_REQUIRED'
  | 'OFFERED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'CLOSED';

export type ApplicationQaCheckKey =
  | 'PROFILE_COMPLETE'
  | 'MANDATORY_DOCUMENTS_PRESENT'
  | 'DOCUMENTS_NOT_EXPIRED'
  | 'ELIGIBILITY_CHECKED'
  | 'NO_UNRESOLVED_CONTRADICTIONS'
  | 'NO_DUPLICATE_APPLICATION'
  | 'COST_DISCLOSURE_VIEWED'
  | 'PROVIDER_IDENTITY_CHECKED'
  | 'SUBMISSION_SNAPSHOT_REVIEWED'
  | 'APPLICANT_APPROVED';

export interface ApplicationQaInput {
  profileComplete: boolean;
  mandatoryDocumentsPresent: boolean;
  documentsNotExpired: boolean;
  eligibilityChecked: boolean;
  unresolvedContradictions: boolean;
  duplicateApplication: boolean;
  costDisclosureViewed: boolean;
  providerIdentityChecked: boolean;
  submissionSnapshotReviewed: boolean;
  applicantApproved: boolean;
}

export interface ApplicationQaResult {
  status: UnifiedApplicationStatus;
  checks: { key: ApplicationQaCheckKey; passed: boolean }[];
  blockers: ApplicationQaCheckKey[];
  readyToSubmit: boolean;
}

/** §7.6 — submission readiness is deterministic and applicant approval is mandatory. */
export function evaluateApplicationQa(input: ApplicationQaInput): ApplicationQaResult {
  const checks: ApplicationQaResult['checks'] = [
    { key: 'PROFILE_COMPLETE', passed: input.profileComplete },
    { key: 'MANDATORY_DOCUMENTS_PRESENT', passed: input.mandatoryDocumentsPresent },
    { key: 'DOCUMENTS_NOT_EXPIRED', passed: input.documentsNotExpired },
    { key: 'ELIGIBILITY_CHECKED', passed: input.eligibilityChecked },
    { key: 'NO_UNRESOLVED_CONTRADICTIONS', passed: !input.unresolvedContradictions },
    { key: 'NO_DUPLICATE_APPLICATION', passed: !input.duplicateApplication },
    { key: 'COST_DISCLOSURE_VIEWED', passed: input.costDisclosureViewed },
    { key: 'PROVIDER_IDENTITY_CHECKED', passed: input.providerIdentityChecked },
    { key: 'SUBMISSION_SNAPSHOT_REVIEWED', passed: input.submissionSnapshotReviewed },
    { key: 'APPLICANT_APPROVED', passed: input.applicantApproved },
  ];
  const blockers = checks.filter((check) => !check.passed).map((check) => check.key);
  let status: UnifiedApplicationStatus = 'READY_TO_SUBMIT';
  if (!input.profileComplete) status = 'PROFILE_INCOMPLETE';
  else if (!input.mandatoryDocumentsPresent || !input.documentsNotExpired)
    status = 'DOCS_INCOMPLETE';
  else if (!input.eligibilityChecked) status = 'ELIGIBILITY_REVIEW';
  else if (
    input.unresolvedContradictions ||
    input.duplicateApplication ||
    !input.costDisclosureViewed ||
    !input.providerIdentityChecked
  )
    status = 'QA_REVIEW';
  else if (!input.submissionSnapshotReviewed || !input.applicantApproved)
    status = 'USER_APPROVAL_REQUIRED';
  return { status, checks, blockers, readyToSubmit: blockers.length === 0 };
}

export interface SubmissionSnapshot {
  id: string;
  applicationId: string;
  applicantUserId: string;
  profileVersion: number;
  documentIds: string[];
  applicationPayloadHash: string;
  renderedSummary: LocalizedText;
  costDisclosureIds: string[];
  providerVerificationEvidenceIds: string[];
  createdAt: string;
  approvedAt?: string;
  approvedByUserId?: string;
  assistedByUserId?: string;
  immutable: true;
}

export interface ApplicationQaReview {
  id: string;
  applicationId: string;
  snapshotId: string;
  result: ApplicationQaResult;
  reviewedByUserId?: string;
  reviewedAt: string;
  sourceIds: string[];
}

export type DataConfidence =
  | 'VERIFIED'
  | 'SUPPORTED_BY_OFFICIAL_SOURCE'
  | 'SUPPORTED_BY_PROVIDER_SOURCE'
  | 'ESTIMATED'
  | 'INCOMPLETE_DATA'
  | 'NEEDS_HUMAN_REVIEW';

export type DebtRiskBand = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' | 'UNKNOWN';

export interface MobilityRoiInput {
  currency: string;
  upfrontCosts: MoneyJson[];
  officialCosts: MoneyJson[];
  optionalCosts: MoneyJson[];
  savingsAvailable: MoneyJson;
  borrowedAmount: MoneyJson;
  /** Informational simple-interest assumption, in basis points per year. */
  annualInterestBasisPoints?: number;
  repaymentMonths?: number;
  monthlyNetIncomeRange: { min: MoneyJson; max: MoneyJson };
  monthlyLivingCostRange: { min: MoneyJson; max: MoneyJson };
  remittanceGoal?: MoneyJson;
  assumptions: LocalizedText[];
  sourceIds: string[];
  confidence: DataConfidence;
}

export interface MobilityRoiResult {
  currency: string;
  totalUpfrontCost: MoneyJson;
  officialCost: MoneyJson;
  optionalCost: MoneyJson;
  debtNeeded: MoneyJson;
  monthlySavingsRange: { min: MoneyJson; max: MoneyJson };
  breakEvenMonthsRange: { min: number | null; max: number | null };
  estimatedMonthlyDebtService?: MoneyJson;
  debtServiceShareOfSavingsPercent?: { min: number | null; max: number | null };
  debtRisk: DebtRiskBand;
  warnings: string[];
  assumptions: LocalizedText[];
  sourceIds: string[];
  confidence: DataConfidence;
}

function sumMinor(items: readonly MoneyJson[], currency: string): bigint {
  return items.reduce((sum, item) => {
    if (item.currency.toUpperCase() !== currency.toUpperCase()) {
      throw new Error('Mobility ROI requires one source-backed currency projection at a time');
    }
    return sum + BigInt(item.minorUnits);
  }, 0n);
}

function money(minorUnits: bigint, currency: string): MoneyJson {
  return { minorUnits: minorUnits.toString(), currency: currency.toUpperCase() };
}

function ceilDivide(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) return 0n;
  return (numerator + denominator - 1n) / denominator;
}

function monthsToBreakEven(upfront: bigint, monthlySavings: bigint): number | null {
  if (monthlySavings <= 0n) return null;
  const months = ceilDivide(upfront, monthlySavings);
  return months > BigInt(Number.MAX_SAFE_INTEGER) ? null : Number(months);
}

function percentage(part: bigint, whole: bigint): number | null {
  if (whole <= 0n) return null;
  return Number((part * 100n) / whole);
}

/** §13 — conservative, range-based decision support; never a promise or financial advice. */
export function calculateMobilityRoi(input: MobilityRoiInput): MobilityRoiResult {
  const currency = input.currency.toUpperCase();
  const validate = (value: MoneyJson) => {
    if (value.currency.toUpperCase() !== currency) throw new Error('ROI currency mismatch');
    return BigInt(value.minorUnits);
  };
  const total = sumMinor(input.upfrontCosts, currency);
  const official = sumMinor(input.officialCosts, currency);
  const optional = sumMinor(input.optionalCosts, currency);
  const savingsAvailable = validate(input.savingsAvailable);
  const declaredDebt = validate(input.borrowedAmount);
  const debtNeeded =
    declaredDebt > total - savingsAvailable ? declaredDebt : total - savingsAvailable;
  const safeDebtNeeded = debtNeeded > 0n ? debtNeeded : 0n;
  const incomeMin = validate(input.monthlyNetIncomeRange.min);
  const incomeMax = validate(input.monthlyNetIncomeRange.max);
  const livingMin = validate(input.monthlyLivingCostRange.min);
  const livingMax = validate(input.monthlyLivingCostRange.max);
  const remittance = input.remittanceGoal ? validate(input.remittanceGoal) : 0n;
  const monthlySavingsMin = incomeMin - livingMax - remittance;
  const monthlySavingsMax = incomeMax - livingMin - remittance;
  const repaymentMonths = input.repaymentMonths ?? 0;
  let monthlyDebtService: bigint | undefined;
  if (safeDebtNeeded > 0n && repaymentMonths > 0) {
    const interestBps = BigInt(input.annualInterestBasisPoints ?? 0);
    const simpleInterest =
      (safeDebtNeeded * interestBps * BigInt(repaymentMonths)) / (10_000n * 12n);
    monthlyDebtService = ceilDivide(safeDebtNeeded + simpleInterest, BigInt(repaymentMonths));
  }
  const debtShareLow = monthlyDebtService
    ? percentage(monthlyDebtService, monthlySavingsMax)
    : safeDebtNeeded === 0n
      ? 0
      : null;
  const debtShareHigh = monthlyDebtService
    ? percentage(monthlyDebtService, monthlySavingsMin)
    : safeDebtNeeded === 0n
      ? 0
      : null;
  const worstShare = debtShareHigh ?? debtShareLow;
  const debtRisk: DebtRiskBand =
    safeDebtNeeded === 0n
      ? 'NONE'
      : worstShare === null
        ? 'UNKNOWN'
        : worstShare >= 80
          ? 'SEVERE'
          : worstShare >= 50
            ? 'HIGH'
            : worstShare >= 30
              ? 'MODERATE'
              : 'LOW';
  const warnings: string[] = [];
  if (monthlySavingsMin <= 0n) warnings.push('NON_POSITIVE_CONSERVATIVE_MONTHLY_SAVINGS');
  if (debtRisk === 'HIGH' || debtRisk === 'SEVERE') warnings.push('HIGH_DEBT_SERVICE_SHARE');
  if (input.confidence === 'INCOMPLETE_DATA' || input.confidence === 'NEEDS_HUMAN_REVIEW')
    warnings.push('INCOMPLETE_OR_UNVERIFIED_ASSUMPTIONS');
  return {
    currency,
    totalUpfrontCost: money(total, currency),
    officialCost: money(official, currency),
    optionalCost: money(optional, currency),
    debtNeeded: money(safeDebtNeeded, currency),
    monthlySavingsRange: {
      min: money(monthlySavingsMin, currency),
      max: money(monthlySavingsMax, currency),
    },
    breakEvenMonthsRange: {
      min: monthsToBreakEven(total, monthlySavingsMax),
      max: monthsToBreakEven(total, monthlySavingsMin),
    },
    ...(monthlyDebtService === undefined
      ? {}
      : { estimatedMonthlyDebtService: money(monthlyDebtService, currency) }),
    debtServiceShareOfSavingsPercent: { min: debtShareLow, max: debtShareHigh },
    debtRisk,
    warnings,
    assumptions: input.assumptions,
    sourceIds: input.sourceIds,
    confidence: input.confidence,
  };
}

export type EscalationReason =
  | 'USER_REQUESTED'
  | 'HIGH_COMPLEXITY'
  | 'CONFLICTING_DATA'
  | 'CRITICAL_MISSING_EVIDENCE'
  | 'REPEATED_FAILED_TASK'
  | 'DOCUMENT_ISSUE'
  | 'PROVIDER_OR_JOB_RISK'
  | 'INSUFFICIENT_CONFIDENCE'
  | 'REJECTION_OR_REFUSAL_REVIEW'
  | 'ACCESSIBILITY_OR_ASSISTED_SERVICE';

export interface SmartEscalationInput {
  userRequested: boolean;
  routeComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  conflictingData: boolean;
  criticalMissingEvidence: boolean;
  failedTaskCount: number;
  documentIssue: boolean;
  riskFlag: boolean;
  confidence: DataConfidence;
  rejectionReview: boolean;
  assistedServiceNeed: boolean;
}

export function smartEscalationReasons(input: SmartEscalationInput): EscalationReason[] {
  const reasons: EscalationReason[] = [];
  if (input.userRequested) reasons.push('USER_REQUESTED');
  if (input.routeComplexity === 'HIGH') reasons.push('HIGH_COMPLEXITY');
  if (input.conflictingData) reasons.push('CONFLICTING_DATA');
  if (input.criticalMissingEvidence) reasons.push('CRITICAL_MISSING_EVIDENCE');
  if (input.failedTaskCount >= 2) reasons.push('REPEATED_FAILED_TASK');
  if (input.documentIssue) reasons.push('DOCUMENT_ISSUE');
  if (input.riskFlag) reasons.push('PROVIDER_OR_JOB_RISK');
  if (['INCOMPLETE_DATA', 'NEEDS_HUMAN_REVIEW'].includes(input.confidence))
    reasons.push('INSUFFICIENT_CONFIDENCE');
  if (input.rejectionReview) reasons.push('REJECTION_OR_REFUSAL_REVIEW');
  if (input.assistedServiceNeed) reasons.push('ACCESSIBILITY_OR_ASSISTED_SERVICE');
  return reasons;
}

export interface ProviderRiskSignal {
  id: string;
  providerId: string;
  kind:
    | 'LICENSE_EXPIRED'
    | 'IDENTITY_MISMATCH'
    | 'COMPLAINT_VOLUME'
    | 'REPEATED_FEE_COMPLAINT'
    | 'OFFER_INCONSISTENCY'
    | 'SUSPICIOUS_SALARY'
    | 'CONTRACT_SUBSTITUTION'
    | 'DOCUMENT_ANOMALY'
    | 'OFFICIAL_ENFORCEMENT'
    | 'OFF_PLATFORM_PAYMENT'
    | 'IMPERSONATION'
    | 'DUPLICATE_ENTITY';
  severity: 'INFO' | 'CAUTION' | 'WARNING' | 'CRITICAL';
  evidenceIds: string[];
  status: 'OPEN' | 'REVIEWING' | 'CONFIRMED' | 'DISMISSED' | 'REMEDIATED';
  publicExplanation?: LocalizedText;
  createdAt: string;
  expiresAt?: string;
}

export interface VerificationEvidence {
  id: string;
  subjectType: string;
  subjectId: string;
  claim: string;
  evidenceType: string;
  sourceId: string;
  checkedAt: string;
  expiresAt?: string;
  reviewerUserId?: string;
  method: 'AUTOMATED' | 'MANUAL';
  confidence: DataConfidence;
  history: { at: string; actorUserId?: string; action: string }[];
}

export type AdvisorSpecialization =
  | 'WORK_PATHWAY'
  | 'STUDY_PATHWAY'
  | 'VISA'
  | 'QUALIFICATION_RECOGNITION'
  | 'CONTRACT_OR_OFFER'
  | 'SCHOLARSHIP'
  | 'FINANCE'
  | 'DOCUMENT_QA'
  | 'INTERVIEW'
  | 'PRE_DEPARTURE';

export interface AdvisorProfile {
  id: string;
  userId: string;
  displayName: string;
  verificationEvidenceIds: string[];
  specializations: AdvisorSpecialization[];
  languages: string[];
  countryCodes: string[];
  routeIds: string[];
  price?: MoneyJson;
  commercialRelationships: string[];
  rating?: number;
  complaintStatus: 'NONE' | 'OPEN' | 'RESTRICTED' | 'SUSPENDED';
  status: 'PENDING' | 'ACTIVE' | 'RESTRICTED' | 'SUSPENDED';
}

export interface AdvisorSession {
  id: string;
  advisorId: string;
  userId: string;
  caseId?: string;
  approvedContextFields: string[];
  channel: 'VIDEO' | 'CHAT' | 'IN_PERSON';
  startsAt: string;
  status: 'BOOKED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  notes?: string;
  summary?: LocalizedText;
  actionItems: LocalizedText[];
  transcriptConsent: boolean;
  invoiceId?: string;
  complaintId?: string;
}

export interface ServiceOffer {
  id: string;
  providerId?: string;
  problemKey: string;
  title: LocalizedText;
  isPublicOrFreeOption: boolean;
  verificationEvidenceIds: string[];
  price?: MoneyJson;
  priceStatus: 'EXACT' | 'RANGE' | 'UNKNOWN' | 'FREE';
  included: LocalizedText[];
  excluded: LocalizedText[];
  cancellationAndRefund: LocalizedText;
  mandatory: false;
  partnerRelationship: 'NONE' | 'REFERRAL' | 'PAID_PLACEMENT' | 'OWNED';
  delivery: 'REMOTE' | 'IN_PERSON' | 'HYBRID';
  languages: string[];
  location?: string;
  sourceIds: string[];
}

export interface JourneyLearningModule {
  id: string;
  title: LocalizedText;
  goalType: MobilityGoal;
  countryCode?: string;
  pathwayId?: string;
  stage: MobilityLifecycleStage;
  estimatedMinutes: number;
  format: 'TEXT' | 'AUDIO' | 'VIDEO' | 'CHECKLIST' | 'QUIZ';
  sourceIds: string[];
  lastReviewedAt: string;
  assessmentId?: string;
  required: boolean;
}

export interface ArrivalPlan {
  id: string;
  caseId: string;
  countryCode: string;
  triggeredAt: string;
  tasks: {
    id: string;
    module:
      | 'ENTRY_BORDER'
      | 'ADDRESS_REGISTRATION'
      | 'RESIDENCE_PERMIT'
      | 'TAX_ID'
      | 'SOCIAL_SECURITY'
      | 'HEALTH_INSURANCE'
      | 'BANKING'
      | 'SIM'
      | 'TRANSPORT'
      | 'ONBOARDING'
      | 'HOUSING'
      | 'RIGHTS'
      | 'CONTRACT_PAYSLIP'
      | 'EMERGENCY'
      | 'CONSULAR'
      | 'LANGUAGE'
      | 'COMMUNITY'
      | 'FAMILY_DEPENDANTS'
      | 'RENEWAL';
    title: LocalizedText;
    optionPriority: 'PUBLIC_OR_LOW_COST' | 'VERIFIED_PARTNER' | 'COMMERCIAL';
    status: 'TODO' | 'DONE' | 'NOT_APPLICABLE';
    sourceIds: string[];
  }[];
  firstThirtyDaysBudget: {
    currency: string;
    items: TransparentCostItem[];
    confidence: DataConfidence;
    sourceDate?: string;
  };
}

export interface DepartureReadinessPlan {
  id: string;
  caseId: string;
  goal: 'WORK' | 'STUDY';
  items: {
    id: string;
    title: LocalizedText;
    category: 'SHARED' | 'WORK' | 'STUDY';
    completed: boolean;
    sourceIds: string[];
    listenKey?: string;
  }[];
  generatedAt: string;
  printable: boolean;
}

export interface JourneyStory {
  id: string;
  countryCode: string;
  routeId: string;
  occupationOrProgram: LocalizedText;
  year: number;
  preparationDurationDays?: number;
  applicationDurationDays?: number;
  totalCostBand?: { min: MoneyJson; max: MoneyJson };
  scholarshipBand?: { min: MoneyJson; max: MoneyJson };
  salaryBand?: { min: MoneyJson; max: MoneyJson };
  result: LocalizedText;
  verificationState:
    | 'SELF_REPORTED'
    | 'PARTIALLY_VERIFIED'
    | 'OUTCOME_VERIFIED'
    | 'COST_VERIFIED'
    | 'FULL_CASE_VERIFIED';
  verifiedAttributes: string[];
  consentLevel: 'ANONYMOUS' | 'PUBLIC_NAME' | 'PUBLIC_PROFILE';
  typicalityDisclaimer: LocalizedText;
  publishedAt?: string;
}

export interface IntelligenceUpdate {
  id: string;
  type:
    | 'COUNTRY_UPDATE'
    | 'VISA_RULE_CHANGE'
    | 'SCHOLARSHIP_DEADLINE'
    | 'GOVERNMENT_ANNOUNCEMENT'
    | 'LABOUR_MARKET'
    | 'UNIVERSITY_INTAKE'
    | 'SCAM_ALERT'
    | 'FEE_CHANGE'
    | 'RECOGNITION_CHANGE'
    | 'ARRIVAL_OR_RIGHTS'
    | 'EXPLAINER'
    | 'COMPARISON';
  title: LocalizedText;
  summary: LocalizedText;
  sourceIds: string[];
  sourceAuthority: string;
  publishedAt: string;
  verifiedAt: string;
  affectedCountryCodes: string[];
  affectedRouteIds: string[];
  affectedCaseIds: string[];
  reviewStatus: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'WITHDRAWN';
}

export interface CommunityPostSafetyResult {
  allowed: boolean;
  requiresModeration: boolean;
  signals: ('PHONE_SOLICITATION' | 'PAYMENT_REQUEST' | 'EXTERNAL_LINK' | 'UNVERIFIED_JOB')[];
}

/** §15.4 — deterministic pre-moderation. Human review remains authoritative. */
export function assessCommunityPostSafety(
  text: string,
  options: { structuredOpportunityId?: string; verifiedCommercialRole: boolean },
): CommunityPostSafetyResult {
  const signals: CommunityPostSafetyResult['signals'] = [];
  if (/(?:\+?880|0)1[3-9]\d{8}/.test(text.replace(/[\s-]/g, '')))
    signals.push('PHONE_SOLICITATION');
  if (/(?:bKash|Nagad|Rocket|bank transfer|send money|পেমেন্ট|টাকা পাঠান)/i.test(text))
    signals.push('PAYMENT_REQUEST');
  if (/(?:https?:\/\/|wa\.me\/|t\.me\/)/i.test(text)) signals.push('EXTERNAL_LINK');
  if (/(?:job|vacancy|চাকরি|নিয়োগ|নিয়োগ)/i.test(text) && !options.structuredOpportunityId)
    signals.push('UNVERIFIED_JOB');
  const commercialRisk =
    !options.verifiedCommercialRole &&
    signals.some((signal) => signal === 'PAYMENT_REQUEST' || signal === 'UNVERIFIED_JOB');
  return {
    allowed: signals.length === 0,
    requiresModeration: signals.length > 0 || commercialRisk,
    signals,
  };
}

export interface PartnerPlaybookCompletion {
  id: string;
  providerId: string;
  playbookType: 'RECRUITER' | 'EMPLOYER' | 'ADVISOR';
  moduleKeys: string[];
  completedAt: string;
  expiresAt?: string;
  status: 'CURRENT' | 'EXPIRING' | 'EXPIRED' | 'REVOKED';
}

export interface AssistedSession {
  id: string;
  centreId: string;
  staffUserId: string;
  userId: string;
  consentId: string;
  startedAt: string;
  expiresAt: string;
  endedAt?: string;
  actions: { at: string; action: string; resourceId?: string }[];
  localFilesSaved: false;
  browserAutofillAllowed: false;
}

export interface ReturnPlan {
  id: string;
  caseId: string;
  stage: 'CONTRACT_COMPLETION' | 'RETURN_PREPARATION' | 'RETURNED' | 'REINTEGRATION';
  skillsRecordDocumentIds: string[];
  tasks: { id: string; title: LocalizedText; completed: boolean; sourceIds: string[] }[];
  nextMovePreference?: 'REINTEGRATE' | 'ENTREPRENEURSHIP' | 'NEXT_OVERSEAS_MOVE';
  updatedAt: string;
}

/** External capability record. Live status requires legal/technical approval evidence. */
export interface IntegrationConnector {
  id: string;
  kind:
    | 'RAIMS'
    | 'BMET_OEP'
    | 'BOESL'
    | 'VISA_VERIFICATION'
    | 'INSTITUTION'
    | 'EMPLOYER'
    | 'DOCUMENT_AUTHENTICITY'
    | 'PAYMENT'
    | 'COMMUNICATIONS';
  mode: 'CANONICAL_LINK' | 'MANUAL_VERIFICATION' | 'AUTHORIZED_API';
  status: 'DESIGNED' | 'LEGAL_REVIEW_REQUIRED' | 'TECHNICAL_REVIEW' | 'ACTIVE' | 'SUSPENDED';
  authorityOrVendor: string;
  dataShared: string[];
  legalReviewEvidenceId?: string;
  technicalApprovalEvidenceId?: string;
  lastHealthCheckAt?: string;
}
