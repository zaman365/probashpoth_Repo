import type { LocalizedText } from './localized';

/** §23 — scanner verdicts. AI may explain; it can never upgrade a verdict (§41). */
export type ScanVerdict =
  'VERIFIED' | 'PARTIALLY_VERIFIED' | 'MISMATCH' | 'HIGH_RISK' | 'UNKNOWN_HUMAN_CHECK_REQUIRED';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type RiskSignalKind =
  | 'unregistered_intermediary'
  | 'payment_to_personal_account'
  | 'cost_above_declared'
  | 'salary_mismatch'
  | 'role_mismatch'
  | 'employer_mismatch'
  | 'agency_not_licensed'
  | 'agency_licence_expired'
  | 'job_id_not_found'
  | 'visa_class_inconsistent'
  | 'guarantee_language'
  | 'institution_domain_mismatch'
  | 'offer_document_unverifiable'
  | 'cash_payment_requested'
  | 'contract_differs_from_offer';

export interface RiskSignal {
  id: string;
  kind: RiskSignalKind;
  level: RiskLevel;
  title: LocalizedText;
  explanation: LocalizedText;
  /** What the user should do next, in plain Bangla. Always actionable. */
  advice: LocalizedText;
  evidence: Record<string, unknown>;
  raisedAt: string;
  sourceIds: string[];
}

/** Verdict is derived deterministically from signals — never authored by a model. */
export function deriveVerdict(
  signals: readonly RiskSignal[],
  options: { checkedEverythingRequired: boolean },
): ScanVerdict {
  if (signals.some((s) => s.level === 'critical')) return 'HIGH_RISK';
  const hasMismatch = signals.some(
    (s) =>
      s.kind === 'salary_mismatch' ||
      s.kind === 'role_mismatch' ||
      s.kind === 'employer_mismatch' ||
      s.kind === 'contract_differs_from_offer',
  );
  if (hasMismatch) return 'MISMATCH';
  if (signals.some((s) => s.level === 'high')) return 'HIGH_RISK';
  if (!options.checkedEverythingRequired) return 'UNKNOWN_HUMAN_CHECK_REQUIRED';
  if (signals.length > 0) return 'PARTIALLY_VERIFIED';
  return 'VERIFIED';
}
