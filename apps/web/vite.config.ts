import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import hostingConfig from '../../.openai/hosting.json';

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';
const isDirectCloudflareBuild = process.env.PROBASH_DIRECT_CLOUDFLARE === '1';
const SITE_CREATOR_PLACEHOLDER_DATABASE_ID = '00000000-0000-4000-8000-000000000000';
const { d1, r2 } = hostingConfig;

const localBindingConfig = {
  main: 'vinext/server/app-router-entry',
  d1_databases: d1 && !isDirectCloudflareBuild
    ? [
        {
          binding: d1,
          database_name: 'probashjatra-operational',
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets:
    r2 && !isDirectCloudflareBuild
      ? [{ binding: r2, bucket_name: 'probashjatra-documents' }]
      : [],
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
          replacement: fileURLToPath(new URL('../../packages/i18n/src/index.ts', import.meta.url)),
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
