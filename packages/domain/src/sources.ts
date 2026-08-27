import type { LocalizedText } from './localized';

/** §37/§38 — provenance is user-facing. Nothing is a timeless fact. */
export type SourceKind =
  | 'government_portal'
  | 'ministry'
  | 'immigration_authority'
  | 'labour_authority'
  | 'embassy_mission'
  | 'official_registry'
  | 'international_organization'
  | 'institution_official'
  | 'official_bulletin_upload';

export interface RegulatorySource {
  id: string;
  kind: SourceKind;
  countryCode: string;
  authority: LocalizedText;
  title: LocalizedText;
  url: string;
  /** How often this source must be re-checked (§68 data-quality SLOs), in days. */
  reviewCadenceDays: number;
  lastRetrievedAt?: string;
  lastReviewedAt?: string;
  /** sha256 of the last raw snapshot — immutable evidence of what we read (§42.15). */
  lastSnapshotHash?: string;
  notes?: LocalizedText;
  /** Unified guide §18.4. Optional during additive backfill; material rules must prefer tiers 1–4. */
  trustTier?:
    | 'TIER_1_OFFICIAL'
    | 'TIER_2_REGULATOR_OR_PUBLIC_BODY'
    | 'TIER_3_INSTITUTION_OR_EMPLOYER'
    | 'TIER_4_VERIFIED_PARTNER'
    | 'TIER_5_SECONDARY_REFERENCE';
  jurisdiction?: string;
  language?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  status?: 'ACTIVE' | 'STALE' | 'UNAVAILABLE' | 'REPLACED' | 'REVIEW_REQUIRED';
}

export interface SourceRef {
  sourceId: string;
  /** Optional deep reference: section, clause, table row. */
  locator?: string;
  retrievedAt?: string;
}

/** §68 — the public UI must show freshness, not hide it. */
export type FreshnessState = 'fresh' | 'ageing' | 'stale' | 'unknown';

export function freshnessOf(
  lastReviewedAt: string | undefined,
  reviewCadenceDays: number,
  now: Date = new Date(),
): FreshnessState {
  if (!lastReviewedAt) return 'unknown';
  const reviewed = Date.parse(lastReviewedAt);
  if (Number.isNaN(reviewed)) return 'unknown';
  const ageDays = (now.getTime() - reviewed) / 86_400_000;
  if (ageDays <= reviewCadenceDays) return 'fresh';
  if (ageDays <= reviewCadenceDays * 2) return 'ageing';
  return 'stale';
}
