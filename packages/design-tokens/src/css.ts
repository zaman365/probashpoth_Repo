import {
  breakpoint,
  control,
  elevation,
  motion,
  radius,
  semanticDark,
  semanticLight,
  size,
  space,
  typography,
} from './tokens';

function entries(prefix: string, record: Record<string, string | number>, unit = ''): string[] {
  return Object.entries(record).map(
    ([key, value]) =>
      `  --${prefix}-${key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}: ${value}${
        typeof value === 'number' && unit ? unit : ''
      };`,
  );
}

/**
 * Emits CSS custom properties consumed by the web app and the Tauri operator app.
 * Generating them from one source keeps every surface visually identical (ADR 0001).
 */
export function cssVariables(): string {
  const light = [
    ...entries('color', semanticLight),
    ...entries('size', size, 'px'),
    ...entries('control', control, 'px'),
    ...entries('space', space, 'px'),
    ...entries('radius', radius, 'px'),
    ...entries('font-size', typography.scale, 'px'),
    ...entries('font-weight', typography.weight),
    ...entries('elevation', elevation),
    ...entries('motion', motion),
    ...entries('breakpoint', breakpoint, 'px'),
    `  --font-family-bangla: ${typography.fontFamilyBangla};`,
    `  --font-family-latin: ${typography.fontFamilyLatin};`,
    `  --line-height-bangla: ${typography.lineHeightBangla};`,
    `  --line-height-latin: ${typography.lineHeightLatin};`,
  ].join('\n');

  const dark = entries('color', semanticDark).join('\n');

  return [
    ':root {',
    light,
    '}',
    '',
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme="light"]) {',
    dark.replace(/^/gm, '  '),
    '  }',
    '}',
    '',
    ':root[data-theme="dark"] {',
    dark,
    '}',
  ].join('\n');
}
