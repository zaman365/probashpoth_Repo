import { NotFoundError } from '@probash/domain';
import type { Ledger } from '@probash/ledger';
import type {
  AuditEventRecord,
  AcademicProfileRecord,
  AlertSubscriptionRecord,
  CountryProfileRecord,
  CaseMilestoneRecord,
  CaseRecord,
  CaseTaskRecord,
  ConsentRecordRow,
  CostItemRecord,
  CostPlanRecord,
  CountryRecord,
  CourseRecord,
  CredentialRecord,
  DelegationRecord,
  DocumentRecord,
  DocumentShareRecord,
  FeeRuleRecord,
  InstitutionRecord,
  JobRecord,
  OccupationRecord,
  OrganizationRecord,
  OtpChallengeRecord,
  OutboxRecord,
  PaymentIntentRecord,
  MigrationPassportRecord,
  PreparationTaskRecord,
  ProfileRecord,
  ProviderTransactionRecord,
  RouteVersionRecord,
  RuleVersionRecord,
  ReadinessAssessmentRecord,
  RecommendationSetRecord,
  ScanRecord,
  SessionRecord,
  SourceRecord,
  UserRecord,
  WorkProfileRecord,
  WorkApplicationRecord,
  WorkOfferDecisionRecord,
  WorkOutcomeRecord,
  StudyApplicationRecord,
  StudyOutcomeRecord,
  StudyShortlistRecord,
  ComplaintRecord,
  ComplaintEventRecord,
  HumanReviewRecord,
  HumanReviewDecisionRecord,
  PublicationChangeRecord,
  PartnerSubmissionRecord,
  PartnerFeeDeclarationRecord,
  PartnerAccessGrantRecord,
  PartnerPipelineEventRecord,
  OutcomeReviewRecord,
} from './records';

/**
 * ADR 0001 — persistence is a port. The in-memory driver runs the trust-rail slice;
 * the PostgreSQL driver implements the same interface behind STORAGE_DRIVER.
 */
export interface Collection<T extends { id: string }> {
  get(id: string): Promise<T | undefined>;
  require(id: string): Promise<T>;
  list(predicate?: (item: T) => boolean): Promise<T[]>;
  find(predicate: (item: T) => boolean): Promise<T | undefined>;
  put(item: T): Promise<T>;
  remove(id: string): Promise<void>;
  count(predicate?: (item: T) => boolean): Promise<number>;
}

export interface Storage {
  users: Collection<UserRecord>;
  otpChallenges: Collection<OtpChallengeRecord>;
  sessions: Collection<SessionRecord>;
  profiles: Collection<ProfileRecord>;
  migrationPassports: Collection<MigrationPassportRecord>;
  workProfiles: Collection<WorkProfileRecord>;
  academicProfiles: Collection<AcademicProfileRecord>;
  readinessAssessments: Collection<ReadinessAssessmentRecord>;
  preparationTasks: Collection<PreparationTaskRecord>;
  recommendations: Collection<RecommendationSetRecord>;
  alertSubscriptions: Collection<AlertSubscriptionRecord>;
  workApplications: Collection<WorkApplicationRecord>;
  workOfferDecisions: Collection<WorkOfferDecisionRecord>;
  workOutcomes: Collection<WorkOutcomeRecord>;
  studyApplications: Collection<StudyApplicationRecord>;
  studyOutcomes: Collection<StudyOutcomeRecord>;
  studyShortlists: Collection<StudyShortlistRecord>;
  complaints: Collection<ComplaintRecord>;
  complaintEvents: Collection<ComplaintEventRecord>;
  humanReviews: Collection<HumanReviewRecord>;
  humanReviewDecisions: Collection<HumanReviewDecisionRecord>;
  publicationChanges: Collection<PublicationChangeRecord>;
  partnerSubmissions: Collection<PartnerSubmissionRecord>;
  partnerFeeDeclarations: Collection<PartnerFeeDeclarationRecord>;
  partnerAccessGrants: Collection<PartnerAccessGrantRecord>;
  partnerPipelineEvents: Collection<PartnerPipelineEventRecord>;
  outcomeReviews: Collection<OutcomeReviewRecord>;
  consents: Collection<ConsentRecordRow>;
  delegations: Collection<DelegationRecord>;
  credentials: Collection<CredentialRecord>;

  countries: Collection<CountryRecord>;
  sources: Collection<SourceRecord>;
  routeVersions: Collection<RouteVersionRecord>;
  ruleVersions: Collection<RuleVersionRecord>;
  occupations: Collection<OccupationRecord>;
  organizations: Collection<OrganizationRecord>;
  jobs: Collection<JobRecord>;
  feeRules: Collection<FeeRuleRecord>;
  institutions: Collection<InstitutionRecord>;
  countryProfiles: Collection<CountryProfileRecord>;
  courses: Collection<CourseRecord>;

  cases: Collection<CaseRecord>;
  caseTasks: Collection<CaseTaskRecord>;
  caseMilestones: Collection<CaseMilestoneRecord>;
  costPlans: Collection<CostPlanRecord>;
  costItems: Collection<CostItemRecord>;

  paymentIntents: Collection<PaymentIntentRecord>;
  providerTransactions: Collection<ProviderTransactionRecord>;

  documents: Collection<DocumentRecord>;
  documentShares: Collection<DocumentShareRecord>;

  scans: Collection<ScanRecord>;
  auditEvents: Collection<AuditEventRecord>;
  outbox: Collection<OutboxRecord>;

  /** Double-entry ledger (ADR 0004). Never a plain status column. */
  ledger: Ledger;

  /** Production drivers persist the invariant engine after each balanced posting. */
  flushLedger?(): Promise<void>;

  reset?(): Promise<void>;
}

export class MemoryCollection<T extends { id: string }> implements Collection<T> {
  private readonly items = new Map<string, T>();

  constructor(
    private readonly name: string,
    seed: readonly T[] = [],
  ) {
    for (const item of seed) this.items.set(item.id, item);
  }

  async get(id: string): Promise<T | undefined> {
    return this.items.get(id);
  }

  async require(id: string): Promise<T> {
    const item = this.items.get(id);
    if (!item) throw new NotFoundError(this.name, id);
    return item;
  }

  async list(predicate?: (item: T) => boolean): Promise<T[]> {
    const all = [...this.items.values()];
    return predicate ? all.filter(predicate) : all;
  }

  async find(predicate: (item: T) => boolean): Promise<T | undefined> {
    return [...this.items.values()].find(predicate);
  }

  async put(item: T): Promise<T> {
    this.items.set(item.id, item);
    return item;
  }

  async remove(id: string): Promise<void> {
    this.items.delete(id);
  }

  async count(predicate?: (item: T) => boolean): Promise<number> {
    return (await this.list(predicate)).length;
  }

  clear(): void {
    this.items.clear();
  }
}

export const STORAGE = Symbol('PROBASH_STORAGE');
