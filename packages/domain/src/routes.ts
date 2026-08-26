import type { LocalizedText } from './localized';
import type { SourceRef } from './sources';

/** §9 — a route is a specific legal pathway, not a destination. */
export type RoutePurpose = 'work' | 'study' | 'training' | 'business' | 'family' | 'other';

export type RouteStatus =
  | 'open'
  | 'limited'
  | 'quota'
  | 'seasonal'
  | 'employer_sponsored'
  | 'government_program'
  | 'temporarily_paused'
  | 'closed'
  | 'unknown_needs_review';

export type PublicationStatus = 'draft' | 'review' | 'published' | 'withdrawn';

export type RequirementKind =
  | 'document'
  | 'education'
  | 'experience'
  | 'language'
  | 'skill'
  | 'medical'
  | 'police_clearance'
  | 'financial'
  | 'sponsor'
  | 'post_arrival';

export interface RequirementRef {
  id: string;
  kind: RequirementKind;
  label: LocalizedText;
  description?: LocalizedText;
  mandatory: boolean;
  /** Fact key this requirement reads from the applicant profile, if machine-checkable. */
  factKey?: string;
  sources: SourceRef[];
  /** Where the applicant actually performs this step (§20). */
  performedAt?: LocalizedText;
  estimatedDays?: number;
}

export type RiskSeverity = 'info' | 'caution' | 'warning' | 'severe';

export interface RiskNotice {
  id: string;
  severity: RiskSeverity;
  title: LocalizedText;
  body: LocalizedText;
  sources: SourceRef[];
}

export interface DurationRange {
  minDays: number;
  maxDays: number;
}

/** §9 — MobilityRouteVersion. Everything effective-dated, everything sourced. */
export interface MobilityRouteVersion {
  id: string;
  routeId: string;
  version: number;
  purpose: RoutePurpose;
  originCountry: 'BD';
  destinationCountry: string;
  visaClass?: string;
  permitClass?: string;
  officialName: LocalizedText;
  summary: LocalizedText;
  status: RouteStatus;
  /** Rule expression id evaluated by @probash/rules. */
  eligibilityRuleId: string;
  requirements: RequirementRef[];
  expectedTimeline?: DurationRange;
  workRightsNote?: LocalizedText;
  studyRightsNote?: LocalizedText;
  dependantsNote?: LocalizedText;
  permanentPathwayNotes?: LocalizedText;
  postArrivalObligations: RequirementRef[];
  riskNotices: RiskNotice[];
  /** Cost templates that build a case cost plan (§24). */
  feeRuleIds: string[];
  sourceIds: string[];
  effectiveFrom: string;
  effectiveTo?: string;
  verifiedAt: string;
  verifiedBy: string;
  publicationStatus: PublicationStatus;
  /** Review cadence for this route's critical rules (§68). */
  reviewCadenceDays: number;
  lastReviewedAt?: string;
  /** Development seed data. Never served outside development (§64). */
  isSyntheticDemoData?: boolean;
}

/** Routes that must never be presented as "apply now". */
export const NON_APPLICABLE_ROUTE_STATUSES: readonly RouteStatus[] = [
  'temporarily_paused',
  'closed',
  'unknown_needs_review',
] as const;

export function routeAcceptsApplications(status: RouteStatus): boolean {
  return !NON_APPLICABLE_ROUTE_STATUSES.includes(status);
}
