import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localBindingConfig = {
  main: 'vinext/server/app-router-entry',
  compatibility_flags: ['nodejs_compat'],
};

export default defineConfig(async () => {
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    // Compile workspace packages from source. Their published build remains
    // CommonJS for Node services, while the Worker bundle needs analyzable ESM.
    resolve: {
      alias: [
        {
          find: /^@probash\/contracts$/,
          replacement: fileURLToPath(
            new URL('../../packages/contracts/src/index.ts', import.meta.url),
          ),
        },
        {
          find: /^@probash\/design-tokens$/,
          replacement: fileURLToPath(
            new URL('../../packages/design-tokens/src/index.ts', import.meta.url),
          ),
        },
        {
          find: /^@probash\/domain$/,
          replacement: fileURLToPath(
            new URL('../../packages/domain/src/index.ts', import.meta.url),
          ),
        },
        {
          find: /^@probash\/i18n$/,
          replacement: fileURLToPath(
            new URL('../../packages/i18n/src/index.ts', import.meta.url),
          ),
        },
        {
          find: /^@probash\/web-ui$/,
          replacement: fileURLToPath(
            new URL('../../packages/web-ui/src/index.ts', import.meta.url),
          ),
        },
      ],
    },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: localBindingConfig,
      }),
    ],
  };
});
