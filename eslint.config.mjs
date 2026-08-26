import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Lint rules that encode blueprint constraints, not just style (§83).
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/coverage/**',
      'apps/mobile/**',
      'apps/ops-desktop/**',
      'data/**',
      'infra/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // §83 — no `any` without a documented reason.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      'no-restricted-syntax': [
        'error',
        {
          // §83 — money is never a float. Amounts are Money / minor units.
          selector: "CallExpression[callee.name='parseFloat']",
          message: 'Money must never go through parseFloat — use Money.parse (§83).',
        },
        {
          // §41 / §76.7 — a verification level is derived, never assigned by hand.
          selector:
            "AssignmentExpression[left.property.name='verificationLevel'][right.type='Literal']",
          message:
            'A verification level is derived from checked facets, never assigned directly (§75).',
        },
      ],
    },
  },
  {
    // NestJS reads constructor types from decorator metadata at runtime, so an
    // injected class must be a value import. Autofixing it to `import type` breaks DI.
    files: ['apps/api/**/*.ts'],
    rules: { '@typescript-eslint/consistent-type-imports': 'off' },
  },
  {
    // Node scripts (.mjs generators, seed tools) run outside the browser.
    files: ['**/*.mjs', '**/scripts/**'],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly', URL: 'readonly' },
    },
  },
  {
    // Tests and generator scripts may print and may use loose typing for fixtures.
    files: ['**/*.test.ts', '**/*.test.tsx', '**/scripts/**', '**/seed/**'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
