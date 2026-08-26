/**
 * §52 — calm, trustworthy, public-service quality without looking bureaucratic.
 * One primary accent. Understated Bangladesh identity. High contrast.
 * No gradients, no banner clutter, no icon soup.
 */

export const color = {
  /** Neutral surfaces carry the product; the accent is used sparingly. */
  neutral: {
    0: '#ffffff',
    50: '#f7f8f7',
    100: '#eef0ee',
    200: '#dfe3e0',
    300: '#c4cac6',
    400: '#9aa39e',
    500: '#6f7777',
    600: '#545c58',
    700: '#3d443f',
    800: '#2a302c',
    900: '#171a18',
  },
  /** A single deep green accent: recognisably Bangladeshi without flag-waving. */
  primary: {
    50: '#e9f5ee',
    100: '#c9e6d5',
    200: '#9ed2b5',
    300: '#6cb992',
    400: '#3f9d72',
    500: '#1f7a52',
    600: '#166344',
    700: '#124e36',
    800: '#0d3a28',
    900: '#08251a',
  },
  /** A warm sand tint used sparingly for marketing bands, never inside worker flows. */
  sand: {
    50: '#faf8f4',
    100: '#f3efe7',
    200: '#e8e1d4',
  },
  /**
   * The hero canvas. A deep ink-green ground rather than a photograph: it is
   * license-clean, weighs nothing on a slow connection, and — unlike white text over
   * a picture — its contrast is a fixed, testable number (§52).
   */
  canvas: {
    base: '#0b1f18',
    raised: '#123026',
    glow: '#1f7a52',
    haze: '#0d4a34',
  },
  success: { bg: '#e6f4ea', fg: '#125c2e', border: '#8ccfa4' },
  warning: { bg: '#fdf3e2', fg: '#7a4d05', border: '#e6bd77' },
  danger: { bg: '#fdeceb', fg: '#8a1c14', border: '#e79c96' },
  info: { bg: '#eaf1fb', fg: '#1a457f', border: '#9dbbe6' },
} as const;

export const semanticLight = {
  background: color.neutral[50],
  /** Inverted surface used by the hero and other full-bleed feature bands. */
  canvas: color.canvas.base,
  canvasRaised: color.canvas.raised,
  textOnCanvas: '#f2f7f4',
  textOnCanvasMuted: '#b9cfc5',
  surface: color.neutral[0],
  surfaceMuted: color.neutral[100],
  surfaceWarm: color.sand[50],
  surfaceAccent: color.primary[50],
  border: color.neutral[300],
  textPrimary: color.neutral[900],
  textSecondary: color.neutral[700],
  textOnAccent: color.neutral[0],
  accent: color.primary[600],
  accentHover: color.primary[700],
  focusRing: color.primary[500],
} as const;

export const semanticDark = {
  background: color.neutral[900],
  canvas: color.canvas.base,
  canvasRaised: color.canvas.raised,
  textOnCanvas: '#f2f7f4',
  textOnCanvasMuted: '#b9cfc5',
  surface: color.neutral[800],
  surfaceMuted: color.neutral[700],
  surfaceWarm: color.neutral[800],
  surfaceAccent: color.primary[900],
  border: color.neutral[600],
  textPrimary: color.neutral[50],
  textSecondary: color.neutral[300],
  textOnAccent: color.neutral[900],
  accent: color.primary[300],
  accentHover: color.primary[200],
  focusRing: color.primary[300],
} as const;

/**
 * §15 — 48px minimum tap target, and a 56px "primary action" size for the
 * home screen actions a low-literacy user must never miss.
 */
export const size = {
  tapTargetMin: 48,
  tapTargetPrimary: 56,
  iconSm: 20,
  iconMd: 24,
  iconLg: 32,
  /** Worker flows: one narrow column, one question per screen (§15). */
  maxContentWidth: 720,
  /** Public website: wide enough for real multi-column layout (§14.1). */
  maxSiteWidth: 1200,
  /** Long-form reading measure — roughly 65 characters. */
  maxProseWidth: 680,
} as const;

/** Breakpoints are tokens too, so web and the future mobile UI agree on the shape. */
export const breakpoint = {
  sm: 480,
  md: 760,
  lg: 1024,
  xl: 1280,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  /** The framed-canvas radius: large enough to read as a panel, not a bubble. */
  xl: 28,
  pill: 999,
} as const;

/**
 * §52 — production-grade Bangla UI face paired with a compatible Latin family.
 * Fonts are self-hosted under their licence; no CDN dependency for the app shell.
 */
export const typography = {
  /*
   * The CSS variables are populated by next/font at build time; the quoted names are
   * the fallback for surfaces that do not run Next (the operator desktop app).
   */
  fontFamilyBangla:
    "var(--font-bengali), 'Noto Sans Bengali', 'Hind Siliguri', system-ui, sans-serif",
  fontFamilyLatin: "var(--font-latin), 'Space Grotesk', system-ui, -apple-system, sans-serif",
  fontFamilyMono: "'JetBrains Mono', ui-monospace, monospace",
  /** Bangla conjuncts need more line height than Latin at the same size. */
  lineHeightBangla: 1.75,
  lineHeightLatin: 1.6,
  scale: {
    caption: 14,
    body: 17,
    bodyLarge: 19,
    title: 22,
    heading: 27,
    display: 34,
    /** Money is read aloud and acted on: it gets its own, larger step (§15). */
    amount: 30,
    /** Marketing-scale headings, used only on the public website. */
    display2: 42,
    display3: 54,
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export const motion = {
  /** Short and unobtrusive; respects prefers-reduced-motion at the component layer. */
  fast: '120ms',
  base: '200ms',
  slow: '320ms',
  easing: 'cubic-bezier(0.2, 0, 0.2, 1)',
} as const;

export const elevation = {
  none: 'none',
  low: '0 1px 2px rgba(23, 26, 24, 0.06)',
  medium: '0 2px 10px rgba(23, 26, 24, 0.08)',
  /** Reserved for the hero card and sticky header — nothing else floats. */
  high: '0 12px 32px rgba(23, 26, 24, 0.10)',
  /** The floating pill navigation sitting on the dark canvas. */
  float: '0 8px 24px rgba(8, 37, 26, 0.28)',
} as const;

export const tokens = {
  color,
  semanticLight,
  semanticDark,
  size,
  breakpoint,
  space,
  radius,
  typography,
  motion,
  elevation,
} as const;

export type Tokens = typeof tokens;
