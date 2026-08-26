/**
 * §75 — "Verified" is a strict taxonomy, never a single badge.
 * A real agency licence does not make a specific job real.
 * A real university does not make a PDF offer real.
 */
export type VerificationLevel =
  | 'unverified'
  | 'identity_verified'
  | 'registry_verified'
  | 'document_verified'
  | 'authority_verified'
  | 'transaction_verified'
  | 'post_outcome_verified';

export const VERIFICATION_LEVEL_ORDER: readonly VerificationLevel[] = [
  'unverified',
  'identity_verified',
  'registry_verified',
  'document_verified',
  'authority_verified',
  'transaction_verified',
  'post_outcome_verified',
] as const;

export function verificationRank(level: VerificationLevel): number {
  return VERIFICATION_LEVEL_ORDER.indexOf(level);
}

/** Who established the fact. `ai_assisted` can never be the basis of a verified facet (§41, §76.7). */
export type VerificationMethod =
  | 'self_declared'
  | 'document_upload'
  | 'registry_lookup'
  | 'authority_confirmation'
  | 'issuer_confirmation'
  | 'transaction_evidence'
  | 'human_review';

/**
 * A single checked claim. The UI's "Verified" badge must always be expandable into
 * these facets: what exactly was checked, by whom, against which source, when.
 */
export interface VerificationFacet {
  key: string;
  label: { bn: string; en: string };
  checked: boolean;
  method: VerificationMethod;
  sourceId?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  note?: { bn: string; en: string };
}

export interface VerificationSummary {
  level: VerificationLevel;
  facets: VerificationFacet[];
  /** Explicit list of what was NOT checked — required by §22 and §75. */
  notChecked: VerificationFacet[];
  lastVerifiedAt?: string;
}

/**
 * The overall level is derived from facets, never assigned by hand and never by a model.
 * Highest level whose required methods are all satisfied.
 */
export function deriveVerificationLevel(facets: readonly VerificationFacet[]): VerificationLevel {
  const checked = facets.filter((f) => f.checked);
  if (checked.length === 0) return 'unverified';
  const has = (m: VerificationMethod) => checked.some((f) => f.method === m);
  if (has('transaction_evidence')) return 'transaction_verified';
  if (has('authority_confirmation')) return 'authority_verified';
  if (has('issuer_confirmation') || has('document_upload')) return 'document_verified';
  if (has('registry_lookup')) return 'registry_verified';
  return 'identity_verified';
}
