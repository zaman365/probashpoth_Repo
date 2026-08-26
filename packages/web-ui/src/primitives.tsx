import type { ReactNode } from 'react';

/**
 * Layout and content primitives. Every value resolves to a design token, so the
 * public website, the worker app and the portals cannot drift apart (§52, ADR 0001).
 */

export type Surface = 'default' | 'muted' | 'warm' | 'accent';
export type Gap = 'sm' | 'md' | 'lg';

function classes(...values: (string | false | undefined)[]): string {
  return values.filter(Boolean).join(' ');
}

export function Container({
  width = 'site',
  children,
  className,
}: {
  /** `site` for the website, `narrow` for worker flows, `prose` for long reading. */
  width?: 'site' | 'narrow' | 'prose';
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={classes(`pui-container pui-container-${width}`, className)}>{children}</div>
  );
}

export function Stack({
  gap = 'md',
  children,
  className,
}: {
  gap?: Gap;
  children: ReactNode;
  className?: string;
}) {
  return <div className={classes(`pui-stack pui-stack-${gap}`, className)}>{children}</div>;
}

export function Grid({
  min = 300,
  children,
  className,
}: {
  /** Minimum column width before the grid wraps; below it, a single column. */
  min?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={classes('pui-grid', className)}
      style={{ ['--pui-grid-min' as string]: `${min}px` }}
    >
      {children}
    </div>
  );
}

export function Section({
  surface = 'default',
  eyebrow,
  title,
  lead,
  headingId,
  headingLevel = 2,
  children,
  width = 'site',
}: {
  surface?: Surface;
  eyebrow?: string;
  title?: string;
  lead?: string;
  headingId?: string;
  /**
   * A page's opening section passes `1`. Every page needs exactly one `h1`, and on a
   * marketing page that heading *is* the section title.
   */
  headingLevel?: 1 | 2;
  children?: ReactNode;
  width?: 'site' | 'narrow' | 'prose';
}) {
  const id = headingId ?? (title ? title.replace(/\s+/g, '-').toLowerCase() : undefined);
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <section className={`pui-section pui-surface-${surface}`} aria-labelledby={id}>
      <Container width={width}>
        {eyebrow || title || lead ? (
          <header className="pui-section-header">
            {eyebrow ? <p className="pui-eyebrow">{eyebrow}</p> : null}
            {title ? (
              <Heading id={id} className="pui-section-title">
                {title}
              </Heading>
            ) : null}
            {lead ? <p className="pui-lead">{lead}</p> : null}
          </header>
        ) : null}
        {children}
      </Container>
    </section>
  );
}

export function Card({
  tone = 'default',
  interactive = false,
  children,
  className,
}: {
  tone?: Surface;
  /** Adds hover affordance. Use only when the whole card is a link target. */
  interactive?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={classes(
        'pui-card',
        `pui-card-${tone}`,
        interactive && 'pui-card-interactive',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="pui-prose">{children}</div>;
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="pui-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
      {hint ? <p className="pui-stat-hint">{hint}</p> : null}
    </div>
  );
}

export function StatGroup({ children }: { children: ReactNode }) {
  return <dl className="pui-stat-group">{children}</dl>;
}
