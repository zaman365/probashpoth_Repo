import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * NestJS depends on `emitDecoratorMetadata`, which esbuild does not implement, so the
 * API's tests are transformed with SWC. Without this, constructor injection silently
 * resolves to `undefined` and every test fails for the wrong reason.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    globals: false,
    environment: 'node',
    testTimeout: 20_000,
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
});
