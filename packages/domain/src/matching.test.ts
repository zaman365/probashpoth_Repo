import { describe, expect, it } from 'vitest';
import { rankStudyMatches, rankWorkMatches, type WorkMatchCandidate } from './matching';

describe('transparent matching', () => {
  const workCandidate = (overrides: Partial<WorkMatchCandidate> = {}): WorkMatchCandidate => ({
    candidateId: 'route-a',
    path: 'work',
    routeVersionId: 'route-a-v1',
    countryCode: 'DE',
    hardEligibility: 'unknown',
    jobIds: [],
    factors: [
      { key: 'work.occupation_fit', state: 'fit', weight: 40 },
      { key: 'work.economics_fit', state: 'unknown', weight: 30 },
      { key: 'work.preference_fit', state: 'gap', weight: 30 },
    ],
    sourceIds: ['source-a'],
    dataStatus: 'review_required',
    ...overrides,
  });

  it('keeps hard eligibility outside the preparation score', () => {
    const [result] = rankWorkMatches([workCandidate({ hardEligibility: 'ineligible' })]);
    expect(result?.hardEligibility).toBe('ineligible');
    expect(result?.preparationScore).toBe(40);
  });

  it('ranks an eligible candidate before an unknown candidate without changing either state', () => {
    const results = rankWorkMatches([
      workCandidate({ candidateId: 'unknown', hardEligibility: 'unknown' }),
      workCandidate({ candidateId: 'eligible', hardEligibility: 'eligible' }),
    ]);
    expect(results.map((result) => result.candidateId)).toEqual(['eligible', 'unknown']);
    expect(results[1]?.hardEligibility).toBe('unknown');
  });

  it('reports evidence coverage separately from preparation fit', () => {
    const [result] = rankWorkMatches([workCandidate()]);
    expect(result?.preparationScore).toBe(40);
    expect(result?.evidenceCoveragePercent).toBe(70);
    expect(result?.unknowns).toEqual(['work.economics_fit']);
  });

  it('uses stable candidate ids as the final deterministic tie-breaker', () => {
    const results = rankWorkMatches([
      workCandidate({ candidateId: 'route-b' }),
      workCandidate({ candidateId: 'route-a' }),
    ]);
    expect(results.map((result) => result.candidateId)).toEqual(['route-a', 'route-b']);
  });

  it('keeps the Study engine on study-specific candidates', () => {
    const [result] = rankStudyMatches([
      {
        candidateId: 'program-a',
        path: 'study',
        programId: 'program-a',
        institutionId: 'institution-a',
        countryCode: 'GB',
        hardEligibility: 'unknown',
        factors: [
          { key: 'study.academic_fit', state: 'fit', weight: 50 },
          { key: 'study.funding_fit', state: 'unknown', weight: 50 },
        ],
        sourceIds: ['university-page'],
        dataStatus: 'synthetic_demo',
      },
    ]);
    expect(result?.path).toBe('study');
    expect(result?.strengths).toEqual(['study.academic_fit']);
    expect(result?.unknowns).toEqual(['study.funding_fit']);
  });
});
