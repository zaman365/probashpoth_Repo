import status from '../meta/translation-status.json';
import type { Locale } from '@probash/domain';
import { flattenMessages, getMessages } from './messages';

export type TranslationStatus = 'machine_draft' | 'human_reviewed' | 'authoritative';

/**
 * §16 / ADR 0002 — copy where a translation error can cost a worker money,
 * consent, or safety. These may not ship to production as machine drafts.
 */
export const CRITICAL_KEY_PREFIXES: readonly string[] = [
  'cost.',
  'payment.',
  'legal.',
  'risk.',
  'scanner.verdict',
  'eligibility.noGuarantee',
  'eligibility.unknown',
  'onboarding.consent',
  'documents.sensitiveNotice',
  'family.explain',
  'verification.whatWasVerified',
  'verification.whatWasNotVerified',
  'common.emergency',
  'common.demoDataWarning',
] as const;

export function isCriticalKey(key: string): boolean {
  return CRITICAL_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function criticalKeys(locale: Locale = 'bn-BD'): string[] {
  return Object.keys(flattenMessages(getMessages(locale)))
    .filter(isCriticalKey)
    .sort();
}

type StatusFile = Record<string, Record<string, string> | string>;

export function statusOf(locale: Locale, key: string): TranslationStatus {
  const file = status as unknown as StatusFile;
  const localeMap = file[locale];
  const fallback = (file['defaultStatus'] as string) ?? 'machine_draft';
  if (!localeMap || typeof localeMap === 'string') return fallback as TranslationStatus;
  // Longest matching prefix wins, so a reviewed subtree can override its parent.
  const match = Object.keys(localeMap)
    .filter((prefix) => key.startsWith(prefix))
    .sort((a, b) => b.length - a.length)[0];
  return ((match !== undefined ? localeMap[match] : fallback) ?? fallback) as TranslationStatus;
}

/**
 * Bangla critical copy still awaiting human review. This list is deliberately
 * checked in: it is visible technical debt, and CI fails when a *new* critical key
 * appears without review rather than letting it slip in unnoticed.
 */
export const PENDING_BANGLA_REVIEW: readonly string[] = criticalKeys('bn-BD');

export interface ReviewViolation {
  key: string;
  locale: Locale;
  status: TranslationStatus;
}

export function criticalReviewViolations(locale: Locale = 'bn-BD'): ReviewViolation[] {
  return criticalKeys(locale)
    .map((key) => ({ key, locale, status: statusOf(locale, key) }))
    .filter((entry) => entry.status === 'machine_draft');
}

/**
 * Release gate. Production builds must call this; it throws with the exact list of
 * keys blocking the release (ADR 0002: Bangla review is a release blocker).
 */
export function assertCriticalCopyReviewed(locale: Locale = 'bn-BD'): void {
  const violations = criticalReviewViolations(locale);
  if (violations.length > 0) {
    throw new Error(
      `${violations.length} critical ${locale} message(s) are not human-reviewed:\n` +
        violations.map((v) => `  - ${v.key}`).join('\n'),
    );
  }
}
