import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'md' | 'lg';

function buttonClass(variant: ButtonVariant, size: ButtonSize, full?: boolean): string {
  return ['pui-btn', `pui-btn-${variant}`, `pui-btn-${size}`, full ? 'pui-btn-full' : '']
    .filter(Boolean)
    .join(' ');
}

/**
 * §15 — a control is always text plus (optionally) an icon, never an icon alone, and
 * never smaller than the 48px tap target the tokens define.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  full,
  icon,
  children,
  className,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  icon?: ReactNode;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={rest.type ?? 'button'}
      className={[buttonClass(variant, size, full), className].filter(Boolean).join(' ')}
      {...rest}
    >
      {icon ? (
        <span className="pui-btn-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}

/** The same visual contract for links, so a CTA looks identical wherever it points. */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  full,
  icon,
  children,
  className,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  icon?: ReactNode;
  children: ReactNode;
} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={[buttonClass(variant, size, full), className].filter(Boolean).join(' ')}
      {...rest}
    >
      {icon ? (
        <span className="pui-btn-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </a>
  );
}

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

/** §52 — a tone never carries meaning alone; the label always says it in words. */
export function Badge({
  tone = 'neutral',
  icon,
  children,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className={`pui-badge pui-badge-${tone}`}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
    </span>
  );
}

/**
 * A disclosure that works with no JavaScript — important on a cheap phone and a slow
 * connection, and the reason "what exactly was verified?" is always available (§75).
 */
export function Disclosure({
  summary,
  defaultOpen = false,
  children,
}: {
  summary: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="pui-disclosure" open={defaultOpen}>
      <summary>{summary}</summary>
      <div className="pui-disclosure-body">{children}</div>
    </details>
  );
}
