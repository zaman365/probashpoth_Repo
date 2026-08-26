/**
 * Generates app/tokens.css from @probash/design-tokens so web, mobile and the
 * operator desktop app cannot drift apart visually (ADR 0001, §52).
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { cssVariables } = require('@probash/design-tokens');

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, '..', 'app', 'tokens.css');

writeFileSync(
  target,
  `/* GENERATED FILE — run \`node scripts/generate-tokens-css.mjs\`. Do not edit by hand. */\n${cssVariables()}\n`,
);
console.log(`[design-tokens] wrote ${target}`);
