import type {
  AdvisorProfile,
  AdvisorSession,
  ArrivalPlan,
  AssistedSession,
  DepartureReadinessPlan,
  IntegrationConnector,
  IntelligenceUpdate,
  JourneyLearningModule,
  JourneyStory,
  LocalizedText,
  PartnerPlaybookCompletion,
  ProviderRiskSignal,
  ReturnPlan,
  ServiceOffer,
  SubmissionSnapshot,
  VerificationEvidence,
} from '@probash/domain';
import type {
  ApplicationQaResultDto,
  MobilityRoiResultDto,
  OfficialActionCompletionDto,
  OfficialActionDto,
  RouteCoverageDto,
  SavedItemDto,
  UniversalDeadlineDto,
} from '@probash/contracts';

export type OfficialActionRecord = OfficialActionDto;
export type OfficialActionCompletionRecord = OfficialActionCompletionDto;
export type RouteCoverageRecord = RouteCoverageDto;
export type SavedItemRecord = SavedItemDto;
export type UniversalDeadlineRecord = UniversalDeadlineDto;
export type MobilityRoiAssessmentRecord = MobilityRoiResultDto;
export type SubmissionSnapshotRecord = SubmissionSnapshot;

export interface ApplicationQaReviewRecord {
  id: string;
  applicationId: string;
  ownerUserId: string;
  snapshotId: string;
  result: Omit<ApplicationQaResultDto, 'reviewId' | 'snapshotId' | 'immutableSnapshotCreated'>;
  reviewedByUserId?: string;
  reviewedAt: string;
}

export interface CaseParticipantRecord {
  id: string;
  caseId: string;
  userId?: string;
  organizationId?: string;
  role:
    'APPLICANT' | 'DELEGATE' | 'ADVISOR' | 'EMPLOYER' | 'INSTITUTION' | 'RECRUITER' | 'REVIEWER';
  permissions: string[];
  addedAt: string;
  removedAt?: string;
}

export interface CaseEventRecord {
  id: string;
  caseId: string;
  type: string;
  actorUserId?: string;
  summary: LocalizedText;
  occurredAt: string;
  sourceIds: string[];
}

export interface CaseApprovalRecord {
  id: string;
  caseId: string;
  kind: 'SUBMISSION' | 'ASSISTED_EDIT' | 'DOCUMENT_SHARE' | 'PAYMENT' | 'OFFICIAL_HANDOFF';
  requestedByUserId: string;
  requiredApproverUserId: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'EXPIRED';
  snapshotId?: string;
  requestedAt: string;
  decidedAt?: string;
}

export interface CaseRiskFlagRecord {
  id: string;
  caseId: string;
  kind: string;
  severity: 'INFO' | 'CAUTION' | 'WARNING' | 'CRITICAL';
  status: 'OPEN' | 'REVIEWING' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * P1/P2 lifecycle entities share an encrypted store while retaining a discriminated,
 * type-safe payload. This avoids dozens of duplicate persistence adapters.
 */
export type LifecycleResourceRecord =
  | { id: string; kind: 'PROVIDER_RISK_SIGNAL'; payload: ProviderRiskSignal; createdAt: string }
  | { id: string; kind: 'VERIFICATION_EVIDENCE'; payload: VerificationEvidence; createdAt: string }
  | { id: string; kind: 'ADVISOR_PROFILE'; payload: AdvisorProfile; createdAt: string }
  | { id: string; kind: 'ADVISOR_SESSION'; payload: AdvisorSession; createdAt: string }
  | { id: string; kind: 'SERVICE_OFFER'; payload: ServiceOffer; createdAt: string }
  | { id: string; kind: 'LEARNING_MODULE'; payload: JourneyLearningModule; createdAt: string }
  | { id: string; kind: 'ARRIVAL_PLAN'; payload: ArrivalPlan; createdAt: string }
  | { id: string; kind: 'DEPARTURE_PLAN'; payload: DepartureReadinessPlan; createdAt: string }
  | { id: string; kind: 'JOURNEY_STORY'; payload: JourneyStory; createdAt: string }
  | { id: string; kind: 'INTELLIGENCE_UPDATE'; payload: IntelligenceUpdate; createdAt: string }
  | { id: string; kind: 'PARTNER_PLAYBOOK'; payload: PartnerPlaybookCompletion; createdAt: string }
  | { id: string; kind: 'ASSISTED_SESSION'; payload: AssistedSession; createdAt: string }
  | { id: string; kind: 'RETURN_PLAN'; payload: ReturnPlan; createdAt: string }
  | { id: string; kind: 'INTEGRATION_CONNECTOR'; payload: IntegrationConnector; createdAt: string };
