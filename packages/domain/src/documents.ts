import type { LocalizedText } from './localized';
import type { VerificationLevel } from './verification';

/** §29 — document wallet. Sensitive identifiers are encrypted at field level (§50). */
export type DocumentType =
  | 'nid'
  | 'passport'
  | 'birth_certificate'
  | 'police_clearance'
  | 'bmet_registration'
  | 'training_certificate'
  | 'skill_certificate'
  | 'education_certificate'
  | 'transcript'
  | 'employment_letter'
  | 'test_result'
  | 'medical_report'
  | 'visa'
  | 'work_permit'
  | 'contract'
  | 'insurance'
  | 'air_ticket'
  | 'admission_letter'
  | 'scholarship_letter'
  | 'financial_proof'
  | 'other';

/** Document types that must never be exposed to an employer before consent (§18, §49). */
export const SENSITIVE_DOCUMENT_TYPES: readonly DocumentType[] = [
  'nid',
  'passport',
  'birth_certificate',
  'medical_report',
  'financial_proof',
] as const;

export function isSensitiveDocument(type: DocumentType): boolean {
  return SENSITIVE_DOCUMENT_TYPES.includes(type);
}

export interface StoredDocument {
  id: string;
  ownerUserId: string;
  type: DocumentType;
  label: LocalizedText;
  /** Object storage key. The raw object is never served directly (§50 signed URLs). */
  storageKey: string;
  contentType: string;
  byteSize: number;
  sha256: string;
  version: number;
  uploadedAt: string;
  issuedAt?: string;
  expiresAt?: string;
  issuer?: LocalizedText;
  verificationLevel: VerificationLevel;
  verifiedAt?: string;
  malwareScanStatus: 'pending' | 'clean' | 'infected' | 'failed';
  /** Extracted metadata only. Never the document body, never in logs (§42.16). */
  extracted?: Record<string, string>;
}

/** §29/§51 — sharing is explicit, scoped, expiring and revocable. */
export interface DocumentShare {
  id: string;
  documentId: string;
  grantedByUserId: string;
  audience: { kind: 'organization' | 'user' | 'public_link'; id?: string };
  purpose: LocalizedText;
  expiresAt: string;
  revokedAt?: string;
  watermark: boolean;
  createdAt: string;
  accessCount: number;
}

export function isShareActive(share: DocumentShare, now: Date = new Date()): boolean {
  if (share.revokedAt) return false;
  return Date.parse(share.expiresAt) > now.getTime();
}
