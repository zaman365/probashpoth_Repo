import { Ledger } from '@probash/ledger';
import { MemoryCollection, type Storage } from '../ports';
import { loadSeed, type SeedBundle } from '../seed/load-seed';
import type {
  AuditEventRecord,
  CaseMilestoneRecord,
  CaseRecord,
  CaseTaskRecord,
  ConsentRecordRow,
  CostItemRecord,
  CostPlanRecord,
  CredentialRecord,
  DelegationRecord,
  DocumentRecord,
  DocumentShareRecord,
  OtpChallengeRecord,
  OutboxRecord,
  PaymentIntentRecord,
  ProfileRecord,
  ProviderTransactionRecord,
  ScanRecord,
  SessionRecord,
  UserRecord,
} from '../records';

/**
 * Development storage driver (ADR 0001). Reference data comes from the validated
 * seed; transactional data lives for the life of the process. The PostgreSQL driver
 * implements the same `Storage` port.
 */
export class MemoryStorage implements Storage {
  readonly users = new MemoryCollection<UserRecord>('user');
  readonly otpChallenges = new MemoryCollection<OtpChallengeRecord>('otp_challenge');
  readonly sessions = new MemoryCollection<SessionRecord>('session');
  readonly profiles = new MemoryCollection<ProfileRecord>('profile');
  readonly consents = new MemoryCollection<ConsentRecordRow>('consent');
  readonly delegations = new MemoryCollection<DelegationRecord>('delegation');
  readonly credentials = new MemoryCollection<CredentialRecord>('credential');

  readonly countries;
  readonly sources;
  readonly routeVersions;
  readonly ruleVersions;
  readonly occupations;
  readonly organizations;
  readonly jobs;
  readonly feeRules;
  readonly institutions;
  readonly countryProfiles;
  readonly courses;

  readonly cases = new MemoryCollection<CaseRecord>('case');
  readonly caseTasks = new MemoryCollection<CaseTaskRecord>('case_task');
  readonly caseMilestones = new MemoryCollection<CaseMilestoneRecord>('case_milestone');
  readonly costPlans = new MemoryCollection<CostPlanRecord>('cost_plan');
  readonly costItems = new MemoryCollection<CostItemRecord>('cost_item');

  readonly paymentIntents = new MemoryCollection<PaymentIntentRecord>('payment_intent');
  readonly providerTransactions = new MemoryCollection<ProviderTransactionRecord>(
    'provider_transaction',
  );

  readonly documents = new MemoryCollection<DocumentRecord>('document');
  readonly documentShares = new MemoryCollection<DocumentShareRecord>('document_share');

  readonly scans = new MemoryCollection<ScanRecord>('scan');
  readonly auditEvents = new MemoryCollection<AuditEventRecord>('audit_event');
  readonly outbox = new MemoryCollection<OutboxRecord>('outbox');

  readonly ledger = new Ledger();

  constructor(seed: SeedBundle = loadSeed()) {
    this.countries = new MemoryCollection('country', seed.countries);
    this.sources = new MemoryCollection('regulatory_source', seed.sources);
    this.routeVersions = new MemoryCollection('route_version', seed.routeVersions);
    this.ruleVersions = new MemoryCollection('rule_version', seed.ruleVersions);
    this.occupations = new MemoryCollection('occupation', seed.occupations);
    this.organizations = new MemoryCollection('organization', seed.organizations);
    this.jobs = new MemoryCollection('job', seed.jobs);
    this.feeRules = new MemoryCollection('fee_rule', seed.feeRules);
    this.institutions = new MemoryCollection('institution', seed.institutions);
    this.countryProfiles = new MemoryCollection('country_profile', seed.countryProfiles);
    this.courses = new MemoryCollection('course', seed.courses);
  }

  async reset(): Promise<void> {
    this.users.clear();
    this.otpChallenges.clear();
    this.sessions.clear();
    this.profiles.clear();
    this.consents.clear();
    this.delegations.clear();
    this.credentials.clear();
    this.cases.clear();
    this.caseTasks.clear();
    this.caseMilestones.clear();
    this.costPlans.clear();
    this.costItems.clear();
    this.paymentIntents.clear();
    this.providerTransactions.clear();
    this.documents.clear();
    this.documentShares.clear();
    this.scans.clear();
    this.auditEvents.clear();
    this.outbox.clear();
  }
}
