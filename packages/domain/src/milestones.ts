import type { LocalizedText } from './localized';

/** §25 — settlement is gated on evidence-backed milestones, never on a status flag. */
export type MilestoneKey =
  | 'job_offer_verified'
  | 'worker_selected'
  | 'contract_signed'
  | 'medical_complete'
  | 'permit_or_visa_verified'
  | 'emigration_clearance'
  | 'departure_confirmed'
  | 'arrival_confirmed'
  | 'employment_verified';

export const MILESTONE_ORDER: readonly MilestoneKey[] = [
  'job_offer_verified',
  'worker_selected',
  'contract_signed',
  'medical_complete',
  'permit_or_visa_verified',
  'emigration_clearance',
  'departure_confirmed',
  'arrival_confirmed',
  'employment_verified',
] as const;

export type MilestoneStatus = 'pending' | 'evidence_submitted' | 'verified' | 'failed' | 'skipped';

export interface CaseMilestone {
  id: string;
  caseId: string;
  key: MilestoneKey;
  label: LocalizedText;
  status: MilestoneStatus;
  /** Who is allowed to attest this milestone. Never the party receiving the money alone. */
  attestableBy: ('worker' | 'employer' | 'agency' | 'provider' | 'government' | 'platform')[];
  evidenceDocumentIds: string[];
  verifiedAt?: string;
  verifiedBy?: string;
  failureReason?: LocalizedText;
}

/** §25 — deterministic failure handling. Each mode has an allocation rule. */
export type SettlementFailureMode =
  | 'visa_refusal'
  | 'employer_cancellation'
  | 'worker_cancellation'
  | 'failed_medical'
  | 'document_fraud'
  | 'job_changed'
  | 'salary_changed'
  | 'worker_never_deployed'
  | 'employer_disappeared'
  | 'recruiter_licence_suspended';

export interface RefundRule {
  id: string;
  failureMode: SettlementFailureMode;
  /** Percentage of the worker-paid amount returned, expressed in basis points (10000 = 100%). */
  workerRefundBasisPoints: number;
  /** Non-refundable government/third-party costs already consumed. */
  excludeCategories: string[];
  description: LocalizedText;
  sourceIds: string[];
}
