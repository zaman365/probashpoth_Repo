import type { LocalizedText } from './localized';

/**
 * §7 — every ISO 3166-1 country is seeded; support is an operational state.
 * Never infer that migration is possible just because a country row exists.
 */
export type CountrySupportStatus =
  | 'unsupported'
  | 'information_only'
  | 'researching'
  | 'pilot'
  | 'supported'
  | 'paused'
  | 'restricted'
  | 'suspended';

export type CountryPriorityTier = 'A' | 'B' | 'C' | 'D' | 'E' | 'none';

export interface Country {
  /** ISO 3166-1 alpha-2 */
  code: string;
  /** Present only where the seed carries it; ICU/CLDR does not supply alpha-3. */
  alpha3?: string;
  numeric?: string;
  name: LocalizedText;
  region?: string;
  currencyCode?: string;
  supportStatus: CountrySupportStatus;
  workPriorityTier: CountryPriorityTier;
  isStudyPriority: boolean;
  /** Advisory shown to users when status is restricted/paused/suspended. */
  statusNotice?: LocalizedText;
  statusUpdatedAt?: string;
  sourceIds: string[];
}

export const COUNTRY_STATUSES_ALLOWING_APPLICATIONS: readonly CountrySupportStatus[] = [
  'pilot',
  'supported',
] as const;

export function canStartCaseForCountry(status: CountrySupportStatus): boolean {
  return COUNTRY_STATUSES_ALLOWING_APPLICATIONS.includes(status);
}
