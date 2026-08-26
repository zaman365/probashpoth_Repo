import { describe, expect, it } from 'vitest';
import { hasExpectedFileSignature } from './signatures';

describe('document signatures', () => {
  it('accepts known signatures', () => {
    expect(hasExpectedFileSignature(new TextEncoder().encode('%PDF-1.7'), 'application/pdf')).toBe(
      true,
    );
    expect(hasExpectedFileSignature(new Uint8Array([0xff, 0xd8, 0xff]), 'image/jpeg')).toBe(true);
    expect(
      hasExpectedFileSignature(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), 'image/png'),
    ).toBe(true);
  });

  it('rejects extension-only or mismatched content', () => {
    expect(hasExpectedFileSignature(new TextEncoder().encode('not a pdf'), 'application/pdf')).toBe(
      false,
    );
    expect(hasExpectedFileSignature(new Uint8Array([0xff, 0xd8, 0xff]), 'image/png')).toBe(false);
  });
});
