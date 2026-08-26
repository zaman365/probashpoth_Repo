import { describe, expect, it } from 'vitest';
import {
  assessMigrationPassport,
  buildPreparationPlan,
  compareJourneyReadiness,
  type MigrationPassport,
} from './passport';

function passport(overrides: Partial<MigrationPassport> = {}): MigrationPassport {
  return {
    intent: 'unsure',
    identity: {},
    education: {},
    professional: {},
    study: {},
    language: {},
    finance: {},
    documents: {},
    preferences: { destinationCountries: [] },
    ...overrides,
  };
}

describe('Migration Passport readiness', () => {
  it('keeps unanswered facts unknown instead of turning them into failures', () => {
    const result = assessMigrationPassport(passport(), 'work');
    expect(result.missing).toHaveLength(0);
    expect(result.unknown.length).toBeGreaterThan(0);
    expect(result.outcome).toBe('needs_review');
  });

  it('requires at least twelve months of passport validity', () => {
    const result = assessMigrationPassport(
      passport({ identity: { hasPassport: true, passportValidityMonths: 6 } }),
      'study',
    );
    expect(result.factors.find((item) => item.id === 'valid_passport')?.state).toBe('missing');
  });

  it('checks the academic level against the selected study target', () => {
    const result = assessMigrationPassport(
      passport({
        education: { highestLevel: 'higher_secondary' },
        study: { target: 'master' },
      }),
      'study',
    );
    expect(result.factors.find((item) => item.id === 'academic_level')?.state).toBe('missing');
  });

  it('never marks program prerequisites ready without program evidence', () => {
    const result = assessMigrationPassport(
      passport({ education: { highestLevel: 'master' }, study: { target: 'phd' } }),
      'study',
    );
    expect(result.factors.find((item) => item.id === 'program_prerequisites')?.state).toBe(
      'unknown',
    );
  });

  it('orders missing preparation before facts that need confirmation', () => {
    const result = assessMigrationPassport(
      passport({
        identity: { hasPassport: false },
        professional: { occupationKnown: false },
      }),
      'work',
    );
    const plan = buildPreparationPlan(result);
    expect(plan[0]?.state).toBe('missing');
    expect(plan.findIndex((item) => item.state === 'unknown')).toBeGreaterThan(0);
  });

  it('describes preparation, not hard eligibility or a generic winner', () => {
    const comparison = compareJourneyReadiness(passport());
    expect(comparison.currentlyMorePrepared).toBe('insufficient_data');
    expect(comparison.work.factors.some((item) => item.needsRouteEvidence)).toBe(true);
    expect(comparison.study.factors.some((item) => item.needsRouteEvidence)).toBe(true);
  });
});
