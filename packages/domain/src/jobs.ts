import type { LocalizedText } from './localized';
import type { MoneyJson } from './money';
import type { VerificationSummary } from './verification';
import type { BangladeshAccessibility } from './unified-mobility';

/** §21 — a job is never VERIFIED merely because an agency created it. */
export type JobPublicationStatus =
  'draft' | 'pending_verification' | 'published' | 'suspended' | 'closed';

export interface JobTerms {
  monthlySalary: MoneyJson;
  overtimePolicy: LocalizedText;
  workingHoursPerWeek: number;
  contractDurationMonths: number;
  probationMonths?: number;
  accommodationProvided: boolean;
  foodProvided: boolean;
  transportProvided: boolean;
  insuranceProvided: boolean;
  annualLeaveDays: number;
  /** Who pays airfare and recruitment cost — the employer-pays principle (§5). */
  airfarePaidBy: 'employer' | 'worker' | 'shared';
  recruitmentFeePaidBy: 'employer' | 'worker' | 'shared';
  workPermitPaidBy: 'employer' | 'worker';
  cancellationTerms: LocalizedText;
}

export interface VerifiedJob {
  id: string;
  /** Public, non-PII identifier such as BD-QA-2026-00482915 (§21). */
  publicId: string;
  routeVersionId: string;
  destinationCountry: string;
  occupationId: string;
  title: LocalizedText;
  description: LocalizedText;
  employerOrganizationId: string;
  recruiterOrganizationId?: string;
  positions: number;
  terms: JobTerms;
  /** Maximum lawful amount the worker may be asked to pay for this job (§24). */
  allowedWorkerCost: MoneyJson;
  verification: VerificationSummary;
  publicationStatus: JobPublicationStatus;
  demandValidFrom: string;
  demandValidTo: string;
  createdAt: string;
  updatedAt: string;
  /** Synthetic development records must be visibly labelled (§64). */
  isSyntheticDemoData: boolean;
  bangladeshAccessibility?: BangladeshAccessibility;
  accessibilityReason?: LocalizedText;
}

/** §21 — the public verification page shows state, never PII. */
export interface PublicJobVerification {
  publicId: string;
  status: 'verified' | 'suspended' | 'expired' | 'not_found';
  employerName?: LocalizedText;
  agencyName?: LocalizedText;
  agencyLicence?: { number: string; status: string; validTo?: string };
  occupation?: LocalizedText;
  destinationCountry?: string;
  monthlySalary?: MoneyJson;
  allowedWorkerCost?: MoneyJson;
  demandValidTo?: string;
  verification?: VerificationSummary;
  lastVerifiedAt?: string;
  isSyntheticDemoData?: boolean;
}
