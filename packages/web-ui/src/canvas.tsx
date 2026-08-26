import type { ReactNode } from 'react';

/**
 * The "framed canvas" family.
 *
 * Adapted from a hero pattern that floats a rounded panel on the page and lays glass
 * cards over a photograph. Two deliberate changes:
 *
 * 1. **No photograph.** A licensed image of a migrant worker is neither available nor
 *    appropriate here, and a 200KB hero is a real cost on the connection our users
 *    actually have. The ground is a painted ink-green canvas, so its contrast against
 *    the text is a fixed number that a unit test asserts (§52).
 * 2. **No motion library.** Entrance and hover are CSS, gated on
 *    `prefers-reduced-motion`, and every page stays a server component.
 */

export function CanvasPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={['pui-canvas', className].filter(Boolean).join(' ')}>
      {/* Painted light, not an image. Decorative only. */}
      <div className="pui-canvas-glow" aria-hidden="true" />
      <div className="pui-canvas-inner">{children}</div>
    </div>
  );
}

/** A translucent card for use over the canvas. Never used on a light background. */
export function GlassCard({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'li' | 'article';
}) {
  return <Tag className={['pui-glass', className].filter(Boolean).join(' ')}>{children}</Tag>;
}

/**
 * A pill with a circular icon chip — the reference design's signature control.
 * Rendered as a link because on this product every such call to action navigates.
 */
export function ChipLink({
  href,
  children,
  chip,
  tone = 'accent',
  hrefLang,
}: {
  href: string;
  children: ReactNode;
  chip: ReactNode;
  tone?: 'accent' | 'glass';
  hrefLang?: string;
}) {
  return (
    <a href={href} className={`pui-chip-link pui-chip-${tone}`} hrefLang={hrefLang}>
      <span className="pui-chip-label">{children}</span>
      <span className="pui-chip-badge" aria-hidden="true">
        {chip}
      </span>
    </a>
  );
}

/** Small capability pills that sit under a hero. Text always, icon optional. */
export function FeaturePill({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <li className="pui-feature-pill">
      {icon ? (
        <span className="pui-feature-pill-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </li>
  );
}

/**
 * Staggered entrance. CSS custom property per child rather than a JS animation
 * library — it costs nothing, and it disappears entirely under reduced motion.
 */
export function Reveal({
  children,
  index = 0,
  className,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  return (
    <div
      className={['pui-reveal', className].filter(Boolean).join(' ')}
      style={{ ['--pui-reveal-index' as string]: index }}
    >
      {children}
    </div>
  );
}
