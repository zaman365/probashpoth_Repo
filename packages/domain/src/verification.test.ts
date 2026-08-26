import { describe, expect, it } from 'vitest';
import { deriveVerificationLevel, verificationRank } from './verification';
import type { VerificationFacet } from './verification';

const facet = (over: Partial<VerificationFacet>): VerificationFacet => ({
  key: 'k',
  label: { bn: 'x', en: 'x' },
  checked: true,
  method: 'registry_lookup',
  ...over,
});

describe('verification taxonomy', () => {
  it('treats no checked facet as unverified', () => {
    expect(deriveVerificationLevel([facet({ checked: false })])).toBe('unverified');
  });

  it('does not let a document upload reach authority level', () => {
    expect(deriveVerificationLevel([facet({ method: 'document_upload' })])).toBe(
      'document_verified',
    );
  });

  it('ranks authority confirmation above registry lookup', () => {
    expect(verificationRank('authority_verified')).toBeGreaterThan(
      verificationRank('registry_verified'),
    );
  });

  it('uses the highest satisfied method, not the count of facets', () => {
    expect(
      deriveVerificationLevel([
        facet({ method: 'registry_lookup' }),
        facet({ method: 'authority_confirmation' }),
        facet({ method: 'self_declared' }),
      ]),
    ).toBe('authority_verified');
  });

  it('ignores unchecked high-value facets', () => {
    expect(
      deriveVerificationLevel([
        facet({ method: 'authority_confirmation', checked: false }),
        facet({ method: 'registry_lookup' }),
      ]),
    ).toBe('registry_verified');
  });
});
