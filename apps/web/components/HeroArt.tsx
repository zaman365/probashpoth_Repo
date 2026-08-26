/**
 * The hero graphic: a journey with verified checkpoints.
 *
 * Drawn inline rather than shipped as an asset — the CSP blocks external hosts, and a
 * worker on a slow connection should not wait on decoration. It is `aria-hidden`
 * because it says nothing the headline does not already say.
 */
export function HeroArt() {
  return (
    <svg
      viewBox="0 0 420 300"
      className="hero-art"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id="hero-clip">
          <rect x="0" y="0" width="420" height="300" rx="20" />
        </clipPath>
      </defs>

      <g clipPath="url(#hero-clip)">
        <rect width="420" height="300" fill="var(--color-surface)" />

        {/* The path from home to work abroad. */}
        <path
          d="M40 250C120 250 110 170 180 170s70-90 200-90"
          stroke="var(--color-border)"
          strokeWidth="3"
          strokeDasharray="7 9"
          strokeLinecap="round"
          fill="none"
        />

        {[
          { cx: 40, cy: 250 },
          { cx: 180, cy: 170 },
          { cx: 300, cy: 92 },
        ].map((point) => (
          <g key={`${point.cx}-${point.cy}`}>
            <circle cx={point.cx} cy={point.cy} r="17" fill="var(--color-surface-accent)" />
            <circle
              cx={point.cx}
              cy={point.cy}
              r="17"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2"
            />
            <path
              d={`M${point.cx - 6} ${point.cy} l4.5 4.5 L${point.cx + 7} ${point.cy - 6}`}
              stroke="var(--color-accent)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        ))}

        {/* A receipt: every step leaves a record. */}
        <g transform="translate(232 168)">
          <rect
            width="150"
            height="104"
            rx="12"
            fill="var(--color-surface)"
            stroke="var(--color-border)"
            strokeWidth="2"
          />
          <rect x="18" y="22" width="66" height="9" rx="4.5" fill="var(--color-accent)" />
          <rect x="18" y="44" width="114" height="7" rx="3.5" fill="var(--color-surface-muted)" />
          <rect x="18" y="60" width="92" height="7" rx="3.5" fill="var(--color-surface-muted)" />
          <rect x="18" y="78" width="46" height="10" rx="5" fill="var(--color-surface-accent)" />
        </g>
      </g>
    </svg>
  );
}
