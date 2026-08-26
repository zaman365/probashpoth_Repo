import type { LocalizedText } from './localized';
import type { VerificationSummary } from './verification';

/** §44 — organizations: employers, recruiters, institutions, providers, assistants. */
export type OrganizationType =
  | 'foreign_employer'
  | 'recruiting_agency'
  | 'education_institution'
  | 'training_provider'
  | 'medical_provider'
  | 'testing_provider'
  | 'assistance_desk'
  | 'government_body'
  | 'financial_partner';

export type LicenceStatus = 'active' | 'suspended' | 'expired' | 'revoked' | 'unknown';

export interface OrganizationLicence {
  id: string;
  /** e.g. Bangladesh recruiting licence (RL) number. */
  number: string;
  authority: LocalizedText;
  countryCode: string;
  status: LicenceStatus;
  validFrom?: string;
  validTo?: string;
  sourceId?: string;
  lastVerifiedAt?: string;
}

export interface Organization {
  id: string;
  type: OrganizationType;
  legalName: LocalizedText;
  countryCode: string;
  registrationNumber?: string;
  officialDomain?: string;
  contactEmail?: string;
  licences: OrganizationLicence[];
  verification: VerificationSummary;
  /** §39 — outcome-based trust, never purchasable. */
  trustSignals?: {
    completedPlacements: number;
    upheldComplaints: number;
    averageDeploymentDays?: number;
    lastOutcomeAt?: string;
  };
  suspendedAt?: string;
  suspensionReason?: LocalizedText;
  isSyntheticDemoData: boolean;
}

/** A suspended organization must trigger review of every affected case (§76.9). */
export function organizationCanTransact(org: Organization): boolean {
  if (org.suspendedAt) return false;
  if (org.type === 'recruiting_agency') {
    return org.licences.some((l) => l.status === 'active');
  }
  return true;
}
