import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in parallel for faster local feedback. */
  fullyParallel: true,
  /* Fail faster on CI to surface flaky tests quickly. */
  retries: process.env.CI ? 2 : 0,
  /* Standard timeouts tuned for typical Next.js pages. */
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: !!process.env.CI,
      },
    },
  ],
  webServer: {
    command: process.env.CI
      ? 'npm run start'
      : 'npm run dev -- --hostname 127.0.0.1 --port 3000',
    port: 3000,
    env: {
      SKIP_AUTH: 'true',
      NBCOT_VECTOR_FIXTURE: 'mock',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: '',
      STRIPE_SECRET_KEY: '',
      STRIPE_WEBHOOK_SECRET: '',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
