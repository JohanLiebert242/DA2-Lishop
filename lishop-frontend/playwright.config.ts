import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // Next dev/build on Windows can take >60s on first run; keep E2E stable.
  timeout: 180_000,
  expect: { timeout: 20_000 },
  retries: process.env['CI'] ? 1 : 0,
  // Local Windows dev servers in this monorepo are prone to browser/page crashes under high parallelism.
  workers: process.env['CI'] ? undefined : 1,
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : [['list']],
});
