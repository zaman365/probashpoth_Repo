import { describe, expect, it } from 'vitest';
import { contrastRatio, meetsContrast } from './contrast';
import { cssVariables } from './css';
import { color, control, semanticDark, semanticLight, size, typography } from './tokens';

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

  it('keeps the accent readable in every place it is actually used', () => {
    // Buttons, link text, icons on the page ground, and icons on the accent tint.
    expect(contrastRatio(semanticLight.textOnAccent, semanticLight.accent)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrastRatio(semanticLight.accent, semanticLight.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(semanticLight.accent, semanticLight.background)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrastRatio(semanticLight.accent, semanticLight.surfaceAccent)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it('keeps hero text readable on the dark canvas — the reference design used a photo, we use a fixed ground', () => {
    expect(contrastRatio(semanticLight.textOnCanvas, semanticLight.canvas)).toBeGreaterThanOrEqual(
      7,
    );
    expect(
      contrastRatio(semanticLight.textOnCanvasMuted, semanticLight.canvas),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(semanticLight.textOnCanvas, semanticLight.canvasRaised),
    ).toBeGreaterThanOrEqual(7);
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

  it('keeps the touch minimum at the §15 rule whatever the visual scale does', () => {
    expect(control.touchMin).toBe(size.tapTargetMin);
  });

  it('orders the control scale and keeps every step below the navigation bar', () => {
    expect(control.sm).toBeLessThan(control.md);
    expect(control.md).toBeLessThan(control.lg);
    // A control as tall as the chrome it sits in is what made the header look broken.
    expect(control.lg).toBeLessThan(size.navBar);
    expect(size.navBar - control.lg).toBeGreaterThanOrEqual(8);
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
