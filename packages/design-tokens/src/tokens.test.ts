import { describe, expect, it } from 'vitest';
import { contrastRatio, meetsContrast } from './contrast';
import { cssVariables } from './css';
import { color, semanticDark, semanticLight, size, typography } from './tokens';

describe('accessibility of the palette', () => {
  it('meets WCAG AA for body text in light mode', () => {
    expect(meetsContrast(semanticLight.textPrimary, semanticLight.background)).toBe(true);
    expect(meetsContrast(semanticLight.textSecondary, semanticLight.surface)).toBe(true);
  });

  it('meets WCAG AA for body text in dark mode', () => {
    expect(meetsContrast(semanticDark.textPrimary, semanticDark.background)).toBe(true);
    expect(meetsContrast(semanticDark.textSecondary, semanticDark.surface)).toBe(true);
  });

  it('keeps text on the accent readable — primary buttons carry critical actions', () => {
    expect(meetsContrast(semanticLight.textOnAccent, semanticLight.accent)).toBe(true);
    expect(meetsContrast(semanticDark.textOnAccent, semanticDark.accent)).toBe(true);
  });

  it('keeps status colours readable on their own backgrounds', () => {
    for (const status of [color.success, color.warning, color.danger, color.info]) {
      expect(contrastRatio(status.fg, status.bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('gives every status its own border so a badge is never colour-only', () => {
    const borders = [color.success, color.warning, color.danger, color.info].map((s) => s.border);
    expect(new Set(borders).size).toBe(borders.length);
    for (const status of [color.success, color.warning, color.danger, color.info]) {
      expect(contrastRatio(status.border, status.bg)).toBeGreaterThan(1.3);
    }
  });
});

describe('low-literacy sizing rules (§15)', () => {
  it('never allows a tap target below 48px', () => {
    expect(size.tapTargetMin).toBeGreaterThanOrEqual(48);
    expect(size.tapTargetPrimary).toBeGreaterThanOrEqual(size.tapTargetMin);
  });

  it('keeps body text large enough to read on a cheap phone', () => {
    expect(typography.scale.body).toBeGreaterThanOrEqual(16);
  });

  it('renders money larger than body text', () => {
    expect(typography.scale.amount).toBeGreaterThan(typography.scale.body);
  });

  it('gives Bangla more line height than Latin', () => {
    expect(typography.lineHeightBangla).toBeGreaterThan(typography.lineHeightLatin);
  });
});

describe('css variable output', () => {
  const css = cssVariables();

  it('exposes semantic colours, spacing and the tap target', () => {
    expect(css).toContain('--color-text-primary');
    expect(css).toContain('--size-tap-target-min: 48px');
    expect(css).toContain('--font-family-bangla');
  });

  it('defines the light palette on bare :root and overrides for dark', () => {
    expect(css.indexOf(':root {')).toBeLessThan(css.indexOf('prefers-color-scheme: dark'));
    expect(css).toContain(':root[data-theme="dark"]');
  });
});
