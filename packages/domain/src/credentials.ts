import type { LocalizedText } from './localized';

/** §18 — Skill Passport credential states. */
export type CredentialStatus =
  | 'self_declared'
  | 'document_uploaded'
  | 'issuer_verified'
  | 'government_verified'
  | 'expired'
  | 'disputed';

export type CredentialKind =
  | 'education'
  | 'certification'
  | 'training'
  | 'test_result'
  | 'language'
  | 'licence'
  | 'experience'
  | 'reference'
  | 'foreign_employment';

export interface Credential {
  id: string;
  userId: string;
  kind: CredentialKind;
  title: LocalizedText;
  issuer?: LocalizedText;
  issuedAt?: string;
  expiresAt?: string;
  status: CredentialStatus;
  evidenceDocumentIds: string[];
  /** Machine-readable facts this credential contributes to eligibility evaluation. */
  facts: Record<string, string | number | boolean>;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface SkillPassport {
  userId: string;
  occupationIds: string[];
  totalExperienceMonths: number;
  credentials: Credential[];
  /** Verified outcomes from completed cases (§18) — the reputation asset. */
  verifiedEmploymentOutcomes: {
    caseId: string;
    countryCode: string;
    occupationId: string;
    startedAt: string;
    endedAt?: string;
    verifiedBy: string;
  }[];
  updatedAt: string;
}
