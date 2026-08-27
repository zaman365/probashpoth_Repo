import type { LocalizedText } from './localized';

/** §17/§28/§51 — consent and delegation are explicit, scoped and revocable. */
export type ConsentPurpose =
  | 'account_creation'
  | 'assisted_service'
  | 'document_sharing'
  | 'employer_shortlisting'
  | 'institution_application_sharing'
  | 'government_reporting'
  | 'family_delegation'
  | 'payment_processing'
  | 'communications';

export interface ConsentRecord {
  id: string;
  userId: string;
  purpose: ConsentPurpose;
  granted: boolean;
  /** Exact text the user agreed to, in the language they saw it. */
  statement: LocalizedText;
  locale: string;
  grantedAt: string;
  revokedAt?: string;
  /** Recorded when an assistant captured consent on the user's behalf (§27). */
  capturedByUserId?: string;
  evidence?: { kind: 'otp' | 'signature' | 'voice' | 'in_person'; reference: string };
  /** Narrow recipient/resource scope; absence never implies broad partner access. */
  granteeOrganizationId?: string;
  resourceId?: string;
}

/** §29 — explicit, revocable delegate permissions; sensitive capabilities default off. */
export type DelegationPermission =
  | 'view_progress'
  | 'view_cost'
  | 'receive_payment_alerts'
  | 'receive_status_alerts'
  | 'contact_support'
  | 'emergency_access'
  | 'approve_high_value_payment'
  | 'view_contract_summary'
  | 'upload_documents'
  | 'join_session'
  | 'view_documents'
  | 'edit_profile_draft'
  | 'approve_submission'
  | 'view_messages';

export const DELEGATION_PERMISSIONS: readonly DelegationPermission[] = [
  'view_progress',
  'view_cost',
  'receive_payment_alerts',
  'receive_status_alerts',
  'contact_support',
  'emergency_access',
  'approve_high_value_payment',
  'view_contract_summary',
  'upload_documents',
  'join_session',
  'view_documents',
  'edit_profile_draft',
  'approve_submission',
  'view_messages',
] as const;

export type DelegationRelationship = 'spouse' | 'parent' | 'sibling' | 'child' | 'trusted_person';

export interface Delegation {
  id: string;
  /** The person whose case is being observed. */
  principalUserId: string;
  /** The family co-pilot. May not exist as a user until they accept. */
  delegateUserId?: string;
  delegatePhone: string;
  delegateName?: string;
  relationship: DelegationRelationship;
  permissions: DelegationPermission[];
  status: 'invited' | 'active' | 'revoked' | 'expired';
  invitedAt: string;
  acceptedAt?: string;
  revokedAt?: string;
  expiresAt?: string;
  /** Consent record proving the principal authorized this delegation. */
  consentId: string;
}
