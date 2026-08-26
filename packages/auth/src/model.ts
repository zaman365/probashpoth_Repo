import type { DelegationPermission } from '@probash/domain';

/** §49 — roles alone are insufficient; every decision also reads attributes. */
export type Role =
  | 'worker'
  | 'student'
  | 'family_delegate'
  | 'assistant'
  | 'recruiter_staff'
  | 'employer_staff'
  | 'provider_staff'
  | 'institution_staff'
  | 'gov_officer'
  | 'support_agent'
  | 'researcher'
  | 'compliance_reviewer'
  | 'fraud_analyst'
  | 'platform_admin';

export type SessionKind = 'self' | 'assisted' | 'delegated' | 'break_glass';

export interface DelegationGrant {
  principalUserId: string;
  permissions: DelegationPermission[];
}

export interface Subject {
  userId: string;
  roles: Role[];
  organizationId?: string;
  /** Cases an assistant has been explicitly consented onto (§27). */
  consentedCaseIds?: string[];
  /** Family co-pilot grants held by this subject (§28). */
  delegations?: DelegationGrant[];
  /** Jurisdiction scope for a government officer (§49). */
  jurisdiction?: { countryCode?: string; adminRegion?: string };
  sessionKind: SessionKind;
  /** Mandatory, audited justification for break-glass access (§42.11). */
  breakGlassReason?: string;
  mfaSatisfied?: boolean;
}

export type ResourceType =
  | 'user_profile'
  | 'skill_passport'
  | 'document'
  | 'case'
  | 'cost_plan'
  | 'payment'
  | 'job'
  | 'organization'
  | 'rule_version'
  | 'complaint'
  | 'audit_event';

export type Sensitivity = 'public' | 'normal' | 'sensitive_pii';

export interface Resource {
  type: ResourceType;
  id?: string;
  ownerUserId?: string;
  organizationId?: string;
  caseId?: string;
  sensitivity: Sensitivity;
  /** The owner explicitly consented to this organization seeing this resource. */
  consentedOrganizationIds?: string[];
  countryCode?: string;
}

export type Action =
  'read' | 'read_sensitive' | 'write' | 'verify' | 'publish' | 'settle' | 'export' | 'delete';

export interface Obligations {
  /** Every sensitive read emits an access audit event (§49). */
  auditAccess: boolean;
  /** Fields the caller must mask before returning data (§49 support role). */
  maskFields: string[];
  requireReason: boolean;
}

export interface Decision {
  allowed: boolean;
  /** Machine-readable reason so denials can be tested and explained, not guessed. */
  reason: string;
  obligations: Obligations;
}

export const SENSITIVE_PII_FIELDS = [
  'nidNumber',
  'passportNumber',
  'dateOfBirth',
  'bankAccountNumber',
  'address',
] as const;
