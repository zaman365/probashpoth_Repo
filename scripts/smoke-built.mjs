/**
 * `pnpm smoke:built` — proves the *built* artefacts actually serve traffic.
 *
 * Unit tests exercise source. They cannot catch a packaging mistake, so this
 * script starts what a deployment would start and asks it for a real page:
 *
 *   1. apps/api/dist/main.js            -> GET /api/v1/health
 *   2. the generated Cloudflare Worker  -> GET /bn, which must be Bangla
 *                                          and must be served from the live API
 *
 * Why Wrangler and not `next start`: apps/web is built by `vinext build`, which
 * emits a Workers bundle importing `cloudflare:` scheme modules. Node's ESM
 * loader rejects that scheme, so a Node server answers 500 on every route. The
 * Workers runtime is the only runtime that can serve this build (ADR 0012).
 *
 * Why the API is reached through a counting proxy: a Worker does not inherit the
 * shell environment, so `API_BASE_URL=... wrangler dev` leaves it unset inside the
 * Worker. `lib/api.ts` then silently falls back to the in-process demo client, and
 * the page still returns 200 with Bangla text — so a status-and-language check
 * passes while the whole live-API path goes untested. The var is therefore passed
 * as a real Worker binding, and the proxy asserts the Worker actually called it.
 *
 * Bindings run in Wrangler's local mode, so this needs no Cloudflare account,
 * no credentials and no network. It never touches a production resource.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { resolve } from 'node:path';

const API_PORT = Number(process.env['SMOKE_API_PORT'] ?? 3401);
const WEB_PORT = Number(process.env['SMOKE_WEB_PORT'] ?? 3400);
const PROXY_PORT = Number(process.env['SMOKE_PROXY_PORT'] ?? 3402);
const API_URL = `http://127.0.0.1:${API_PORT}`;
const PROXY_URL = `http://127.0.0.1:${PROXY_PORT}`;
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;

/** Bengali block. The Bangla-first promise is a runtime assertion, not a comment. */
const BANGLA = /[ঀ-৿]/;

const API_ENTRY = resolve('apps/api/dist/main.js');
const WORKER_CONFIG = resolve('apps/web/dist/server/wrangler.json');
const WRANGLER_BIN = resolve('apps/web/node_modules/.bin/wrangler');

const children = [];

function start(command, args, { cwd = process.cwd(), env = {} } = {}) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    // Own process group, so a server that forks (Wrangler forks workerd) can be
    // torn down as a group instead of leaking a port-holding orphan.
    detached: true,
  });
  let output = '';
  child.stdout.on('data', (chunk) => (output += chunk));
  child.stderr.on('data', (chunk) => (output += chunk));
  const record = {
    child,
    get output() {
      return output;
    },
  };
  children.push(record);
  return record;
}

/**
 * Forwards to the API and counts what it forwards, so the smoke test can prove the
 * Worker really called the API instead of quietly serving demo data.
 */
function startCountingProxy() {
  let hits = 0;
  const server = createServer((req, res) => {
    hits += 1;
    const upstream = httpRequest(
      {
        hostname: '127.0.0.1',
        port: API_PORT,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${API_PORT}` },
      },
      (response) => {
        res.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(res);
      },
    );
    upstream.on('error', () => {
      res.writeHead(502);
      res.end();
    });
    req.pipe(upstream);
  });
  return new Promise((resolveProxy) => {
    server.listen(PROXY_PORT, '127.0.0.1', () =>
      resolveProxy({ close: () => server.close(), hits: () => hits }),
    );
  });
}

function stopAll() {
  for (const { child } of children) {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      try {
        child.kill('SIGKILL');
      } catch {
        // Already gone.
      }
    }
  }
}

async function waitFor(url, timeoutMs, label, server) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.child.exitCode !== null) {
      throw new Error(
        `${label} exited early with code ${server.child.exitCode}.\n${server.output.slice(0, 2000)}`,
      );
    }
    try {
      return await fetch(url);
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(
    `${label} did not answer ${url} within ${timeoutMs}ms.\n${server.output.slice(0, 2000)}`,
  );
}

async function main() {
  for (const [path, hint] of [
    [API_ENTRY, 'pnpm build'],
    [WORKER_CONFIG, 'pnpm build'],
    [WRANGLER_BIN, 'pnpm install'],
  ]) {
    if (!existsSync(path)) throw new Error(`Missing ${path}. Run \`${hint}\` first.`);
  }

  const api = start('node', [API_ENTRY], {
    env: { APP_ENV: 'test', STORAGE_DRIVER: 'memory', PORT: String(API_PORT) },
  });
  const health = await waitFor(`${API_URL}/api/v1/health`, 60_000, 'API', api);
  if (health.status !== 200) throw new Error(`API health returned ${health.status}, expected 200.`);
  console.log(`[smoke] API health 200 on ${API_URL}`);

  const proxy = await startCountingProxy();

  const web = start(
    WRANGLER_BIN,
    [
      'dev',
      '--config',
      WORKER_CONFIG,
      '--port',
      String(WEB_PORT),
      '--ip',
      '127.0.0.1',
      // A Worker binding, not a shell variable: the Worker cannot see the latter.
      '--var',
      `API_BASE_URL:${PROXY_URL}`,
    ],
    { cwd: resolve('apps/web'), env: { WRANGLER_SEND_METRICS: 'false' } },
  );

  const page = await waitFor(`${WEB_URL}/bn`, 180_000, 'Web Worker', web);
  if (page.status !== 200) throw new Error(`GET /bn returned ${page.status}, expected 200.`);

  const html = await page.text();
  if (!BANGLA.test(html)) {
    throw new Error(`GET /bn returned no Bangla text (${html.length} bytes).`);
  }
  console.log(`[smoke] built Worker served /bn 200 with Bangla content (${html.length} bytes)`);

  // 200 and Bangla are also true of the demo fallback, so they cannot prove the
  // live path works. This can.
  const hits = proxy.hits();
  proxy.close();
  if (hits === 0) {
    throw new Error(
      'The Worker never called the API: it is serving demo data. API_BASE_URL is not ' +
        'reaching the Worker — pass it as a Worker var, not a shell variable.',
    );
  }
  console.log(`[smoke] the Worker made ${hits} request(s) to the live API`);
  console.log('[smoke] built artefacts serve traffic. This is not a production approval.');
}

main()
  .then(() => {
    stopAll();
    process.exit(0);
  })
  .catch((error) => {
    console.error(`[smoke] FAILED: ${error.message}`);
    stopAll();
    process.exit(1);
  });
