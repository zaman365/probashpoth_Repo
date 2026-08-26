import { Pool } from 'pg';
import { Ledger, type JournalEntry, type LedgerAccount } from '@probash/ledger';
import { Money, NotFoundError } from '@probash/domain';
import type { Collection, Storage } from '../ports';
import { loadSeed, type SeedBundle } from '../seed/load-seed';
import {
  isEncryptedRecordEnvelope,
  RecordCipher,
  type EncryptedRecordEnvelope,
} from './record-cipher';
import type {
  AcademicProfileRecord,
  AlertSubscriptionRecord,
  AuditEventRecord,
  CaseMilestoneRecord,
  CaseRecord,
  CaseTaskRecord,
  ConsentRecordRow,
  CostItemRecord,
  CostPlanRecord,
  CountryProfileRecord,
  CountryRecord,
  CourseRecord,
  CredentialRecord,
  DelegationRecord,
  DocumentRecord,
  DocumentShareRecord,
  FeeRuleRecord,
  InstitutionRecord,
  JobRecord,
  MigrationPassportRecord,
  OccupationRecord,
  OrganizationRecord,
  OtpChallengeRecord,
  OutboxRecord,
  PaymentIntentRecord,
  PreparationTaskRecord,
  ProfileRecord,
  ProviderTransactionRecord,
  ReadinessAssessmentRecord,
  RecommendationSetRecord,
  RouteVersionRecord,
  RuleVersionRecord,
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
} from '../records';

interface PayloadRow {
  id: string;
  payload: unknown;
}

const SENSITIVE_NAMESPACES = new Set([
  'user',
  'otp_challenge',
  'session',
  'identity_profile',
  'migration_passport',
  'work_profile',
  'academic_profile',
  'readiness_assessment',
  'preparation_task',
  'recommendation_set',
  'alert_subscription',
  'work_application',
  'work_offer_decision',
  'work_outcome',
  'study_application',
  'study_outcome',
  'study_shortlist',
  'complaint',
  'complaint_event',
  'human_review',
  'human_review_decision',
  'publication_change',
  'partner_submission',
  'partner_fee_declaration',
  'partner_access_grant',
  'partner_pipeline_event',
  'outcome_review',
  'consent',
  'delegation',
  'credential',
  'mobility_case',
  'case_task',
  'case_milestone',
  'cost_plan',
  'cost_item',
  'payment_intent',
  'provider_transaction',
  'document',
  'document_share',
  'offer_scan',
  'audit_event',
  'outbox_event',
  'ledger_account_snapshot',
  'journal_entry_snapshot',
]);

/** PostgreSQL implementation of the existing typed Collection port. */
export class PostgresCollection<T extends { id: string }> implements Collection<T> {
  constructor(
    private readonly pool: Pool,
    private readonly namespace: string,
    private readonly cipher?: RecordCipher,
  ) {}

  private decode(payload: unknown, id: string): T {
    if (this.cipher && isEncryptedRecordEnvelope(payload)) {
      return this.cipher.decrypt<T>(payload, `${this.namespace}:${id}`);
    }
    return payload as T;
  }

  private encode(item: T): T | EncryptedRecordEnvelope {
    if (!this.cipher) return item;
    return this.cipher.encrypt(item, `${this.namespace}:${item.id}`);
  }

  async get(id: string): Promise<T | undefined> {
    const result = await this.pool.query<PayloadRow>(
      'SELECT id, payload FROM app_record_store WHERE namespace = $1 AND id = $2',
      [this.namespace, id],
    );
    const row = result.rows[0];
    return row ? this.decode(row.payload, row.id) : undefined;
  }

  async require(id: string): Promise<T> {
    const item = await this.get(id);
    if (!item) throw new NotFoundError(this.namespace, id);
    return item;
  }

  async list(predicate?: (item: T) => boolean): Promise<T[]> {
    const result = await this.pool.query<PayloadRow>(
      'SELECT id, payload FROM app_record_store WHERE namespace = $1 ORDER BY updated_at, id',
      [this.namespace],
    );
    const rows = result.rows.map((row) => this.decode(row.payload, row.id));
    return predicate ? rows.filter(predicate) : rows;
  }

  async find(predicate: (item: T) => boolean): Promise<T | undefined> {
    return (await this.list()).find(predicate);
  }

  async put(item: T): Promise<T> {
    await this.pool.query(
      `INSERT INTO app_record_store (namespace, id, payload, updated_at)
       VALUES ($1, $2, $3::jsonb, now())
       ON CONFLICT (namespace, id)
       DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
      [this.namespace, item.id, JSON.stringify(this.encode(item))],
    );
    return item;
  }

  async putMany(items: readonly T[]): Promise<void> {
    if (items.length === 0) return;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const item of items) {
        await client.query(
          `INSERT INTO app_record_store (namespace, id, payload, updated_at)
           VALUES ($1, $2, $3::jsonb, now())
           ON CONFLICT (namespace, id) DO NOTHING`,
          [this.namespace, item.id, JSON.stringify(this.encode(item))],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async remove(id: string): Promise<void> {
    await this.pool.query('DELETE FROM app_record_store WHERE namespace = $1 AND id = $2', [
      this.namespace,
      id,
    ]);
  }

  async count(predicate?: (item: T) => boolean): Promise<number> {
    if (predicate) return (await this.list(predicate)).length;
    const result = await this.pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM app_record_store WHERE namespace = $1',
      [this.namespace],
    );
    return Number(result.rows[0]?.count ?? 0);
  }
}

export class PostgresStorage implements Storage {
  readonly users: PostgresCollection<UserRecord>;
  readonly otpChallenges: PostgresCollection<OtpChallengeRecord>;
  readonly sessions: PostgresCollection<SessionRecord>;
  readonly profiles: PostgresCollection<ProfileRecord>;
  readonly migrationPassports: PostgresCollection<MigrationPassportRecord>;
  readonly workProfiles: PostgresCollection<WorkProfileRecord>;
  readonly academicProfiles: PostgresCollection<AcademicProfileRecord>;
  readonly readinessAssessments: PostgresCollection<ReadinessAssessmentRecord>;
  readonly preparationTasks: PostgresCollection<PreparationTaskRecord>;
  readonly recommendations: PostgresCollection<RecommendationSetRecord>;
  readonly alertSubscriptions: PostgresCollection<AlertSubscriptionRecord>;
  readonly workApplications: PostgresCollection<WorkApplicationRecord>;
  readonly workOfferDecisions: PostgresCollection<WorkOfferDecisionRecord>;
  readonly workOutcomes: PostgresCollection<WorkOutcomeRecord>;
  readonly studyApplications: PostgresCollection<StudyApplicationRecord>;
  readonly studyOutcomes: PostgresCollection<StudyOutcomeRecord>;
  readonly studyShortlists: PostgresCollection<StudyShortlistRecord>;
  readonly complaints: PostgresCollection<ComplaintRecord>;
  readonly complaintEvents: PostgresCollection<ComplaintEventRecord>;
  readonly humanReviews: PostgresCollection<HumanReviewRecord>;
  readonly humanReviewDecisions: PostgresCollection<HumanReviewDecisionRecord>;
  readonly publicationChanges: PostgresCollection<PublicationChangeRecord>;
  readonly partnerSubmissions: PostgresCollection<PartnerSubmissionRecord>;
  readonly partnerFeeDeclarations: PostgresCollection<PartnerFeeDeclarationRecord>;
  readonly partnerAccessGrants: PostgresCollection<PartnerAccessGrantRecord>;
  readonly partnerPipelineEvents: PostgresCollection<PartnerPipelineEventRecord>;
  readonly outcomeReviews: PostgresCollection<OutcomeReviewRecord>;
  readonly consents: PostgresCollection<ConsentRecordRow>;
  readonly delegations: PostgresCollection<DelegationRecord>;
  readonly credentials: PostgresCollection<CredentialRecord>;
  readonly countries: PostgresCollection<CountryRecord>;
  readonly sources: PostgresCollection<SourceRecord>;
  readonly routeVersions: PostgresCollection<RouteVersionRecord>;
  readonly ruleVersions: PostgresCollection<RuleVersionRecord>;
  readonly occupations: PostgresCollection<OccupationRecord>;
  readonly organizations: PostgresCollection<OrganizationRecord>;
  readonly jobs: PostgresCollection<JobRecord>;
  readonly feeRules: PostgresCollection<FeeRuleRecord>;
  readonly institutions: PostgresCollection<InstitutionRecord>;
  readonly countryProfiles: PostgresCollection<CountryProfileRecord>;
  readonly courses: PostgresCollection<CourseRecord>;
  readonly cases: PostgresCollection<CaseRecord>;
  readonly caseTasks: PostgresCollection<CaseTaskRecord>;
  readonly caseMilestones: PostgresCollection<CaseMilestoneRecord>;
  readonly costPlans: PostgresCollection<CostPlanRecord>;
  readonly costItems: PostgresCollection<CostItemRecord>;
  readonly paymentIntents: PostgresCollection<PaymentIntentRecord>;
  readonly providerTransactions: PostgresCollection<ProviderTransactionRecord>;
  readonly documents: PostgresCollection<DocumentRecord>;
  readonly documentShares: PostgresCollection<DocumentShareRecord>;
  readonly scans: PostgresCollection<ScanRecord>;
  readonly auditEvents: PostgresCollection<AuditEventRecord>;
  readonly outbox: PostgresCollection<OutboxRecord>;
  readonly ledger = new Ledger();

  private constructor(
    private readonly pool: Pool,
    private readonly cipher: RecordCipher,
  ) {
    const collection = <T extends { id: string }>(namespace: string) =>
      new PostgresCollection<T>(
        pool,
        namespace,
        SENSITIVE_NAMESPACES.has(namespace) ? cipher : undefined,
      );
    this.users = collection('user');
    this.otpChallenges = collection('otp_challenge');
    this.sessions = collection('session');
    this.profiles = collection('identity_profile');
    this.migrationPassports = collection('migration_passport');
    this.workProfiles = collection('work_profile');
    this.academicProfiles = collection('academic_profile');
    this.readinessAssessments = collection('readiness_assessment');
    this.preparationTasks = collection('preparation_task');
    this.recommendations = collection('recommendation_set');
    this.alertSubscriptions = collection('alert_subscription');
    this.workApplications = collection('work_application');
    this.workOfferDecisions = collection('work_offer_decision');
    this.workOutcomes = collection('work_outcome');
    this.studyApplications = collection('study_application');
    this.studyOutcomes = collection('study_outcome');
    this.studyShortlists = collection('study_shortlist');
    this.complaints = collection('complaint');
    this.complaintEvents = collection('complaint_event');
    this.humanReviews = collection('human_review');
    this.humanReviewDecisions = collection('human_review_decision');
    this.publicationChanges = collection('publication_change');
    this.partnerSubmissions = collection('partner_submission');
    this.partnerFeeDeclarations = collection('partner_fee_declaration');
    this.partnerAccessGrants = collection('partner_access_grant');
    this.partnerPipelineEvents = collection('partner_pipeline_event');
    this.outcomeReviews = collection('outcome_review');
    this.consents = collection('consent');
    this.delegations = collection('delegation');
    this.credentials = collection('credential');
    this.countries = collection('country');
    this.sources = collection('regulatory_source');
    this.routeVersions = collection('route_version');
    this.ruleVersions = collection('rule_version');
    this.occupations = collection('occupation');
    this.organizations = collection('organization');
    this.jobs = collection('job');
    this.feeRules = collection('fee_rule');
    this.institutions = collection('institution');
    this.countryProfiles = collection('country_profile');
    this.courses = collection('course');
    this.cases = collection('mobility_case');
    this.caseTasks = collection('case_task');
    this.caseMilestones = collection('case_milestone');
    this.costPlans = collection('cost_plan');
    this.costItems = collection('cost_item');
    this.paymentIntents = collection('payment_intent');
    this.providerTransactions = collection('provider_transaction');
    this.documents = collection('document');
    this.documentShares = collection('document_share');
    this.scans = collection('offer_scan');
    this.auditEvents = collection('audit_event');
    this.outbox = collection('outbox_event');
  }

  static async connect(
    databaseUrl: string,
    encryptionKey: string,
    seed: SeedBundle = loadSeed(),
  ): Promise<PostgresStorage> {
    const pool = new Pool({ connectionString: databaseUrl });
    await pool.query('SELECT 1');
    const storage = new PostgresStorage(pool, new RecordCipher(encryptionKey));
    await storage.hydrateLedger();
    await storage.ensureSeed(seed);
    return storage;
  }

  private async ensureSeed(seed: SeedBundle): Promise<void> {
    if ((await this.countries.count()) > 0) return;
    await this.countries.putMany(seed.countries);
    await this.sources.putMany(seed.sources);
    await this.routeVersions.putMany(seed.routeVersions);
    await this.ruleVersions.putMany(seed.ruleVersions);
    await this.occupations.putMany(seed.occupations);
    await this.organizations.putMany(seed.organizations);
    await this.jobs.putMany(seed.jobs);
    await this.feeRules.putMany(seed.feeRules);
    await this.institutions.putMany(seed.institutions);
    await this.countryProfiles.putMany(seed.countryProfiles);
    await this.courses.putMany(seed.courses);
  }

  private async hydrateLedger(): Promise<void> {
    const accountStore = new PostgresCollection<LedgerAccount>(
      this.pool,
      'ledger_account_snapshot',
      this.cipher,
    );
    const entryStore = new PostgresCollection<JournalEntry>(
      this.pool,
      'journal_entry_snapshot',
      this.cipher,
    );
    for (const account of await accountStore.list()) {
      this.ledger.openAccount({
        code: account.code,
        name: account.name,
        type: account.type,
        currency: account.currency,
        ownerRef: account.ownerRef,
        openedAt: account.openedAt,
        closedAt: account.closedAt,
      });
    }
    const entries = await entryStore.list();
    for (const entry of entries.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))) {
      this.ledger.post({
        reference: entry.reference,
        description: entry.description,
        occurredAt: entry.occurredAt,
        idempotencyKey: entry.idempotencyKey,
        metadata: entry.metadata,
        reversesEntryId: entry.reversesEntryId,
        lines: entry.lines.map((line) => ({
          accountCode: line.accountCode,
          direction: line.direction,
          amount: Money.fromJSON(line.amount),
          memo: line.memo,
        })),
      });
    }
  }

  async flushLedger(): Promise<void> {
    const accounts = new PostgresCollection<LedgerAccount>(
      this.pool,
      'ledger_account_snapshot',
      this.cipher,
    );
    const entries = new PostgresCollection<JournalEntry>(
      this.pool,
      'journal_entry_snapshot',
      this.cipher,
    );
    await accounts.putMany(this.ledger.listAccounts());
    await entries.putMany(this.ledger.listEntries());
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
