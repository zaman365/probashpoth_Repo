import type { Env } from '@probash/config';

/**
 * §64 — synthetic demo records exist for development only. Outside development they
 * are filtered out entirely, so a "DEMO — Electrician (Doha)" job can never appear
 * to a real worker as a real opportunity.
 */
export function isSyntheticVisible(env: Env): boolean {
  return env.APP_ENV === 'development' || env.APP_ENV === 'test';
}

export function filterSynthetic<T extends { isSyntheticDemoData?: boolean }>(
  items: readonly T[],
  env: Env,
): T[] {
  if (isSyntheticVisible(env)) return [...items];
  return items.filter((item) => item.isSyntheticDemoData !== true);
}
