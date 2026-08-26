/**
 * A fixed icon set, inlined as SVG.
 *
 * Inline rather than a sprite or a font: no extra request on a slow connection, no
 * external host (the CSP forbids one), and no flash of missing meaning. Icons are
 * decorative by default — §15 requires text alongside them for anything critical.
 */
export type IconName =
  | 'verify'
  | 'money'
  | 'route'
  | 'globe'
  | 'work'
  | 'study'
  | 'document'
  | 'family'
  | 'warning'
  | 'phone'
  | 'arrow'
  | 'check'
  | 'listen'
  | 'search'
  | 'menu'
  | 'shield';

const PATHS: Record<IconName, string> = {
  verify: 'M9 12.5l2 2 4.5-4.5M12 3l7.5 3v5.2c0 4.3-3 8.3-7.5 9.8-4.5-1.5-7.5-5.5-7.5-9.8V6L12 3z',
  money: 'M3 7.5h18v9H3v-9zm9 2.2a2.3 2.3 0 100 4.6 2.3 2.3 0 000-4.6zM6.5 7.5v9M17.5 7.5v9',
  route:
    'M6.5 20V9.5a3 3 0 013-3h5a3 3 0 003-3M6.5 20a2 2 0 100-4 2 2 0 000 4zm11-16.5a2 2 0 100-4 2 2 0 000 4z',
  globe:
    'M12 3a9 9 0 100 18 9 9 0 000-18zm0 0c2.5 2.4 3.8 5.4 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.4-3.8-9s1.3-6.6 3.8-9zM3.4 9h17.2M3.4 15h17.2',
  work: 'M3.5 8.5h17v11h-17v-11zm5.5 0V6a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 0115 6v2.5M3.5 13h17',
  study: 'M12 4l9 4.5-9 4.5-9-4.5L12 4zm6 6.8V15c0 1.7-2.7 3-6 3s-6-1.3-6-3v-4.2',
  document: 'M6.5 3.5h7l4.5 4.5v12h-11.5v-16.5zm7 0V8h4.5M9 12.5h6M9 16h6',
  family:
    'M8 11a3 3 0 100-6 3 3 0 000 6zm8 0a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM2.5 20v-1.5A4.5 4.5 0 017 14h2a4.5 4.5 0 014.5 4.5V20m3-6h1a4 4 0 014 4v2',
  warning: 'M12 4l9 15.5H3L12 4zm0 5.5v5m0 3v.5',
  phone:
    'M6.5 3.5h4l1.5 4-2.2 1.6a12 12 0 005.1 5.1l1.6-2.2 4 1.5v4a1.5 1.5 0 01-1.6 1.5C10.6 18.6 5.4 13.4 5 4.9a1.5 1.5 0 011.5-1.4z',
  arrow: 'M5 12h13m-5.5-5.5L19 12l-6.5 5.5',
  check: 'M5 12.5l4.5 4.5L19 7',
  listen: 'M4 9.5h3.5L12 5.5v13L7.5 14.5H4v-5zm11.5-1a5 5 0 010 7m3-10a9 9 0 010 13',
  search: 'M10.5 17a6.5 6.5 0 100-13 6.5 6.5 0 000 13zm4.8-1.7L20 20',
  menu: 'M4 7h16M4 12h16M4 17h16',
  shield: 'M12 3l7.5 3v5.2c0 4.3-3 8.3-7.5 9.8-4.5-1.5-7.5-5.5-7.5-9.8V6L12 3z',
};

export function Icon({
  name,
  size = 24,
  label,
}: {
  name: IconName;
  size?: number;
  /** Provide only when the icon carries meaning no adjacent text conveys. */
  label?: string;
}) {
  return (
    <svg
      className="pui-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/**
 * The wordmark. A route-and-checkpoint motif: understated Bangladesh identity without
 * using the flag as decoration (§52).
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="9" fill="var(--color-accent)" />
      <path
        d="M9 22.5c0-5 3-7.5 7-7.5s7-2.2 7-6"
        stroke="var(--color-text-on-accent)"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <circle cx="9" cy="22.5" r="2.6" fill="var(--color-text-on-accent)" />
      <path
        d="M20.2 9.6l1.7 1.7 3.1-3.1"
        stroke="var(--color-text-on-accent)"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
