import type {
  CaseMilestone,
  CaseState,
  CaseTask,
  ConsentRecord,
  Country,
  CostItem,
  Credential,
  Delegation,
  DocumentShare,
  DocumentType,
  Locale,
  LocalizedText,
  MobilityRouteVersion,
  MoneyJson,
  Occupation,
  Organization,
  RegulatorySource,
  RiskSignal,
  ScanVerdict,
  StoredDocument,
  VerifiedJob,
} from '@probash/domain';
import type { RuleVersion } from '@probash/rules';
import type {
  AcademicProfileDto,
  AlertSubscriptionDto,
  MatchRecommendationDto,
  MigrationPassportDto,
  PreparationTaskDto,
  ReadinessAssessmentDto,
  WorkProfileDto,
  WorkApplicationDto,
  WorkOfferDecisionDto,
  WorkOutcomeDto,
  StudyApplicationDto,
  StudyOutcomeDto,
  StudyShortlistDto,
  ComplaintDto,
  ComplaintEventDto,
  HumanReviewDto,
  HumanReviewDecisionDto,
  PublicationChangeDto,
  PartnerSubmissionDto,
  PartnerFeeDeclarationDto,
  PartnerAccessGrantDto,
  PartnerPipelineEventDto,
  OutcomeReviewDto,
} from '@probash/contracts';

/** Persistence-shaped records. The Postgres driver stores exactly these shapes. */

export interface UserRecord {
  id: string;
  phone: string;
  displayName?: string;
  roles: string[];
  /** Required for supply-side roles; never inferred from an email domain. */
  organizationId?: string;
  locale: Locale;
  createdAt: string;
  lastSeenAt?: string;
  /** Set when an assisted-service operator created the account (§27). */
  createdByAssistantUserId?: string;
}

export interface OtpChallengeRecord {
  id: string;
  phone: string;
  codeHash: string;
  expiresAt: string;
  attempts: number;
  consumedAt?: string;
  locale: Locale;
  assistedByUserId?: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  issuedAt: string;
  expiresAt: string;
  kind: 'self' | 'assisted' | 'delegated' | 'break_glass';
  /** Set only after the external MFA ceremony succeeds; institutional actions expire it. */
  mfaSatisfiedAt?: string;
  revokedAt?: string;
}

export interface ProfileRecord {
  id: string;
  userId: string;
  intent: 'work' | 'study';
  displayName?: string;
  occupationKey?: string;
  experienceMonths?: number;
  educationLevel?: string;
  hasValidPassport?: boolean;
  passportValidMonths?: number;
  hasBmetRegistration?: boolean;
  hasPoliceClearance?: boolean;
  languageCertificates: string[];
  skillCertificates: string[];
  medicallyFit?: boolean;
  destinationPreferences: string[];
  district?: string;
  ageYears?: number;
  locale: Locale;
  updatedAt: string;
}

/** Blueprint §6/§127 — one shared Passport with independent Work and Study profiles. */
export type MigrationPassportRecord = MigrationPassportDto;
export type WorkProfileRecord = WorkProfileDto;
export type AcademicProfileRecord = AcademicProfileDto;
export type ReadinessAssessmentRecord = ReadinessAssessmentDto;
export type PreparationTaskRecord = PreparationTaskDto;
export type AlertSubscriptionRecord = AlertSubscriptionDto;
export type WorkApplicationRecord = WorkApplicationDto;
export type WorkOfferDecisionRecord = WorkOfferDecisionDto;
export type WorkOutcomeRecord = WorkOutcomeDto;
export type StudyApplicationRecord = StudyApplicationDto;
export type StudyOutcomeRecord = StudyOutcomeDto;
export type StudyShortlistRecord = StudyShortlistDto;
export type ComplaintRecord = Omit<ComplaintDto, 'events'>;
export type ComplaintEventRecord = ComplaintEventDto;
export type HumanReviewRecord = HumanReviewDto;
export type HumanReviewDecisionRecord = HumanReviewDecisionDto;
export type PublicationChangeRecord = PublicationChangeDto;
export type PartnerSubmissionRecord = PartnerSubmissionDto;
export type PartnerFeeDeclarationRecord = PartnerFeeDeclarationDto;
export type PartnerAccessGrantRecord = PartnerAccessGrantDto;
export type PartnerPipelineEventRecord = PartnerPipelineEventDto;
export type OutcomeReviewRecord = OutcomeReviewDto;

export interface RecommendationSetRecord {
  id: string;
  userId: string;
  passportVersion: number;
  engineVersion: string;
  work: MatchRecommendationDto[];
  study: MatchRecommendationDto[];
  comparison: {
    genericWinner: null;
    noteKey: 'passport.comparisonNote';
  };
  createdAt: string;
}

export interface CountryRecord extends Country {
  id: string;
}

export type SourceRecord = RegulatorySource;

export type RouteVersionRecord = MobilityRouteVersion;

export type RuleVersionRecord = RuleVersion;

export type OccupationRecord = Occupation;

export type OrganizationRecord = Organization;

export type JobRecord = VerifiedJob;

/** §5/§24 — the fee template that generates a case cost plan. */
export interface FeeRuleRecord {
  id: string;
  routeId: string;
  category: string;
  label: LocalizedText;
  amount: MoneyJson;
  payerKind: string;
  payeeKind: string;
  payeeOrganizationId?: string;
  legallyAllowed: boolean | null;
  legalBasisSourceId?: string;
  refundable: boolean;
  mandatory: boolean;
  receiptRequired: boolean;
  milestoneKey?: string;
  sourceIds: string[];
  effectiveFrom: string;
  effectiveTo?: string;
  /** True when the platform knows a cost exists but cannot yet price or justify it. */
  unresolved?: boolean;
}

export interface CaseRecord {
  id: string;
  ownerUserId: string;
  purpose: 'work' | 'study';
  state: CaseState;
  routeVersionId: string;
  jobId?: string;
  destinationCountry: string;
  createdAt: string;
  updatedAt: string;
  documentIds: string[];
  history: { at: string; from: CaseState; to: CaseState; actorUserId: string; reason?: string }[];
  goalType?: 'WORK' | 'STUDY' | 'TRAINING' | 'EXPLORE';
  lifecycleStage?:
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
  opportunityId?: string;
  providerId?: string;
  overallProgress?: number;
  currentBlocker?: LocalizedText;
  nextAction?: LocalizedText;
  targetDepartureDate?: string;
  actualDepartureDate?: string;
  arrivalDate?: string;
  closedAt?: string;
}

export type CaseTaskRecord = CaseTask;
export type CaseMilestoneRecord = CaseMilestone;

export interface CostPlanRecord {
  id: string;
  caseId: string;
  currency: string;
  itemIds: string[];
  unresolvedItemIds: string[];
  generatedAt: string;
  sourceIds: string[];
}

export type CostItemRecord = CostItem;

export interface PaymentIntentRecord {
  id: string;
  caseId: string;
  costItemId: string;
  userId: string;
  amount: MoneyJson;
  payeeKind: string;
  payeeId: string;
  payeeName: LocalizedText;
  method: string;
  provider: string;
  status: 'created' | 'pending' | 'confirmed' | 'failed' | 'refunded' | 'cancelled';
  milestoneKey?: string;
  idempotencyKey: string;
  providerReference?: string;
  createdAt: string;
  confirmedAt?: string;
  isSandbox: boolean;
}

export interface ProviderTransactionRecord {
  id: string;
  paymentIntentId: string;
  provider: string;
  event: string;
  amount: MoneyJson;
  occurredAt: string;
  receivedAt: string;
  rawSignature: string;
  /** Replay protection for provider webhooks (§83). */
  idempotencyKey: string;
}

export interface DocumentRecord extends StoredDocument {
  caseId?: string;
}

export type DocumentShareRecord = DocumentShare;

export type ConsentRecordRow = ConsentRecord;

export type DelegationRecord = Delegation;

export type CredentialRecord = Credential;

export interface ScanRecord {
  id: string;
  userId?: string;
  verdict: ScanVerdict;
  signals: RiskSignal[];
  checksPerformed: {
    key: string;
    label: LocalizedText;
    performed: boolean;
    passed: boolean | null;
    detail?: LocalizedText;
  }[];
  matchedJobPublicId?: string;
  humanReviewRequested: boolean;
  scannedAt: string;
  inputDigest: string;
}

/** §45 — immutable audit trail; §49 — every sensitive read emits an access event. */
export interface AuditEventRecord {
  id: string;
  kind: 'action' | 'access' | 'security';
  actorUserId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  caseId?: string;
  reason?: string;
  occurredAt: string;
  metadata: Record<string, string>;
}

/** §47 — transactional outbox for reliable event publication. */
export interface OutboxRecord {
  id: string;
  eventName: string;
  payload: Record<string, unknown>;
  createdAt: string;
  publishedAt?: string;
}

export interface InstitutionRecord {
  id: string;
  legalName: LocalizedText;
  countryCode: string;
  institutionType: string;
  officialDomain: string;
  accreditationId?: string;
  recognizedStatus: string;
  sourceIds: string[];
  lastVerifiedAt?: string;
  isSyntheticDemoData: boolean;
}

/** §14.1 — the per-country information vault, one record per country. */
export interface CountryVaultFact {
  label: LocalizedText;
  value: string | null;
  sourceId: string;
  status: 'researched' | 'needs_verification';
  asOf?: string;
  note?: LocalizedText;
}

export interface CountryVaultPath {
  available: boolean;
  summary: LocalizedText;
  visas: {
    key: string;
    name: LocalizedText;
    who: LocalizedText;
    requirements: LocalizedText[];
    sourceId: string;
  }[];
  keyFacts: CountryVaultFact[];
  steps: LocalizedText[];
  documents: LocalizedText[];
  risks: LocalizedText[];
}

export interface CountryProfileRecord {
  id: string;
  countryCode: string;
  verifiedAt: string;
  verifiedBy: string;
  sources: string[];
  paths: { work: CountryVaultPath; study: CountryVaultPath };
}

export interface CourseRecord {
  id: string;
  institutionId: string;
  title: LocalizedText;
  degreeLevel: string;
  subjectIscedF: string;
  durationMonths: number;
  tuition: MoneyJson;
  applicationFee?: MoneyJson;
  languageRequirement?: LocalizedText;
  intakes: string[];
  sourceIds: string[];
  isSyntheticDemoData: boolean;
}

export type DocumentTypeName = DocumentType;
