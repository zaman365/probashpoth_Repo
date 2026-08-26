import { describe, expect, it } from 'vitest';
import type { MigrationPassport } from '@probash/domain';
import { evaluateScholarship, scholarshipById } from './scholarships';

function passport(overrides: Partial<MigrationPassport> = {}): MigrationPassport {
  return {
    intent: 'study',
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

describe('scholarship preparation matching', () => {
  it('keeps an empty profile unknown instead of inventing eligibility', () => {
    const scholarship = scholarshipById('daad-master-all-disciplines');
    expect(scholarship).toBeDefined();
    const match = evaluateScholarship(scholarship!, passport());
    expect(match.state).toBe('unknown');
    expect(match.unknown.length).toBeGreaterThan(0);
  });

  it('explains a strong DAAD preparation match from supplied evidence', () => {
    const scholarship = scholarshipById('daad-master-all-disciplines');
    const match = evaluateScholarship(
      scholarship!,
      passport({
        education: {
          highestLevel: 'bachelor',
          hasCertificates: true,
          hasTranscripts: true,
        },
        study: { target: 'master' },
        language: { englishLevel: 'advanced', hasVerifiedTest: true },
      }),
    );
    expect(match.state).toBe('eligible');
    expect(match.missing).toHaveLength(0);
    expect(match.score).toBe(100);
  });

  it('marks closed cycles as next-cycle preparation even for a prepared profile', () => {
    const scholarship = scholarshipById('chevening-scholarship');
    const match = evaluateScholarship(
      scholarship!,
      passport({
        education: {
          highestLevel: 'bachelor',
          hasCertificates: true,
          hasTranscripts: true,
        },
        professional: { experienceMonths: 30 },
        study: { target: 'master' },
        language: { englishLevel: 'advanced' },
      }),
    );
    expect(match.state).toBe('deadline_missed');
  });
});
