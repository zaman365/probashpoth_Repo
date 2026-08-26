import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts', 'components/**/*.test.tsx'],
    environment: 'node',
  },
  resolve: {
    alias: { '@': new URL('.', import.meta.url).pathname },
  },
});
