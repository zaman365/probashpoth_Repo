import { Ledger } from '@probash/ledger';
import { MemoryCollection, type Storage } from '../ports';
import { loadSeed, type SeedBundle } from '../seed/load-seed';
import type {
  AuditEventRecord,
  AcademicProfileRecord,
  AlertSubscriptionRecord,
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
  MigrationPassportRecord,
  PreparationTaskRecord,
  ProfileRecord,
  ProviderTransactionRecord,
  ScanRecord,
  SessionRecord,
  UserRecord,
  ReadinessAssessmentRecord,
  RecommendationSetRecord,
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
import type {
  ApplicationQaReviewRecord,
  CaseApprovalRecord,
  CaseEventRecord,
  CaseParticipantRecord,
  CaseRiskFlagRecord,
  LifecycleResourceRecord,
  MobilityRoiAssessmentRecord,
  OfficialActionCompletionRecord,
  OfficialActionRecord,
  RouteCoverageRecord,
  SavedItemRecord,
  SubmissionSnapshotRecord,
  UniversalDeadlineRecord,
} from '../unified-records';

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
  readonly migrationPassports = new MemoryCollection<MigrationPassportRecord>('migration_passport');
  readonly workProfiles = new MemoryCollection<WorkProfileRecord>('work_profile');
  readonly academicProfiles = new MemoryCollection<AcademicProfileRecord>('academic_profile');
  readonly readinessAssessments = new MemoryCollection<ReadinessAssessmentRecord>(
    'readiness_assessment',
  );
  readonly preparationTasks = new MemoryCollection<PreparationTaskRecord>('preparation_task');
  readonly recommendations = new MemoryCollection<RecommendationSetRecord>('recommendation');
  readonly alertSubscriptions = new MemoryCollection<AlertSubscriptionRecord>('alert_subscription');
  readonly workApplications = new MemoryCollection<WorkApplicationRecord>('work_application');
  readonly workOfferDecisions = new MemoryCollection<WorkOfferDecisionRecord>(
    'work_offer_decision',
  );
  readonly workOutcomes = new MemoryCollection<WorkOutcomeRecord>('work_outcome');
  readonly studyApplications = new MemoryCollection<StudyApplicationRecord>('study_application');
  readonly studyOutcomes = new MemoryCollection<StudyOutcomeRecord>('study_outcome');
  readonly studyShortlists = new MemoryCollection<StudyShortlistRecord>('study_shortlist');
  readonly complaints = new MemoryCollection<ComplaintRecord>('complaint');
  readonly complaintEvents = new MemoryCollection<ComplaintEventRecord>('complaint_event');
  readonly humanReviews = new MemoryCollection<HumanReviewRecord>('human_review');
  readonly humanReviewDecisions = new MemoryCollection<HumanReviewDecisionRecord>(
    'human_review_decision',
  );
  readonly publicationChanges = new MemoryCollection<PublicationChangeRecord>('publication_change');
  readonly partnerSubmissions = new MemoryCollection<PartnerSubmissionRecord>('partner_submission');
  readonly partnerFeeDeclarations = new MemoryCollection<PartnerFeeDeclarationRecord>(
    'partner_fee_declaration',
  );
  readonly partnerAccessGrants = new MemoryCollection<PartnerAccessGrantRecord>(
    'partner_access_grant',
  );
  readonly partnerPipelineEvents = new MemoryCollection<PartnerPipelineEventRecord>(
    'partner_pipeline_event',
  );
  readonly outcomeReviews = new MemoryCollection<OutcomeReviewRecord>('outcome_review');
  readonly consents = new MemoryCollection<ConsentRecordRow>('consent');
  readonly delegations = new MemoryCollection<DelegationRecord>('delegation');
  readonly credentials = new MemoryCollection<CredentialRecord>('credential');

  readonly officialActions = new MemoryCollection<OfficialActionRecord>('official_action');
  readonly officialActionCompletions = new MemoryCollection<OfficialActionCompletionRecord>(
    'official_action_completion',
  );
  readonly routeCoverages = new MemoryCollection<RouteCoverageRecord>('route_coverage');
  readonly savedItems = new MemoryCollection<SavedItemRecord>('saved_item');
  readonly universalDeadlines = new MemoryCollection<UniversalDeadlineRecord>('universal_deadline');
  readonly mobilityRoiAssessments = new MemoryCollection<MobilityRoiAssessmentRecord>(
    'mobility_roi_assessment',
  );
  readonly submissionSnapshots = new MemoryCollection<SubmissionSnapshotRecord>(
    'submission_snapshot',
  );
  readonly applicationQaReviews = new MemoryCollection<ApplicationQaReviewRecord>(
    'application_qa_review',
  );
  readonly caseParticipants = new MemoryCollection<CaseParticipantRecord>('case_participant');
  readonly caseEvents = new MemoryCollection<CaseEventRecord>('case_event');
  readonly caseApprovals = new MemoryCollection<CaseApprovalRecord>('case_approval');
  readonly caseRiskFlags = new MemoryCollection<CaseRiskFlagRecord>('case_risk_flag');
  readonly lifecycleResources = new MemoryCollection<LifecycleResourceRecord>('lifecycle_resource');

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
    this.migrationPassports.clear();
    this.workProfiles.clear();
    this.academicProfiles.clear();
    this.readinessAssessments.clear();
    this.preparationTasks.clear();
    this.recommendations.clear();
    this.alertSubscriptions.clear();
    this.workApplications.clear();
    this.workOfferDecisions.clear();
    this.workOutcomes.clear();
    this.studyApplications.clear();
    this.studyOutcomes.clear();
    this.studyShortlists.clear();
    this.complaints.clear();
    this.complaintEvents.clear();
    this.humanReviews.clear();
    this.humanReviewDecisions.clear();
    this.publicationChanges.clear();
    this.partnerSubmissions.clear();
    this.partnerFeeDeclarations.clear();
    this.partnerAccessGrants.clear();
    this.partnerPipelineEvents.clear();
    this.outcomeReviews.clear();
    this.consents.clear();
    this.delegations.clear();
    this.credentials.clear();
    this.officialActions.clear();
    this.officialActionCompletions.clear();
    this.routeCoverages.clear();
    this.savedItems.clear();
    this.universalDeadlines.clear();
    this.mobilityRoiAssessments.clear();
    this.submissionSnapshots.clear();
    this.applicationQaReviews.clear();
    this.caseParticipants.clear();
    this.caseEvents.clear();
    this.caseApprovals.clear();
    this.caseRiskFlags.clear();
    this.lifecycleResources.clear();
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
