import { defineConfig, devices } from '@playwright/test';

/**
 * §66 — web E2E covers the Bangla worker journey, not just the English happy path.
 * The API and web servers must already be running (see README) or be started by CI.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: process.env['WEB_BASE_URL'] ?? 'http://localhost:3000',
    locale: 'bn-BD',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'mobile-android', use: { ...devices['Pixel 7'] } },
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
