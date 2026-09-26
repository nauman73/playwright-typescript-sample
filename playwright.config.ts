import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import { STAFF_STATE } from './tests/support/constants';

// Load .env.local, then .env, as Next.js does.
config({ path: ['.env.local', '.env'], quiet: true });

// GitHub runners use UTC. Setting it here gives the same time zone locally, for the test
// runner and for the web server, which inherits this environment.
process.env.TZ = 'UTC';

const CI = !!process.env.CI;
const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/global-setup.ts',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 2 : undefined,
  reporter: CI ? [['html', { open: 'never' }], ['github']] : [['html', { open: 'never' }], ['list']],
  use: { baseURL, timezoneId: 'UTC', trace: 'on-first-retry', screenshot: 'only-on-failure' },
  projects: [
    { name: 'setup', testMatch: /setup\/.*\.setup\.ts/ },
    { name: 'api', testMatch: /api\/.*\.spec\.ts/, dependencies: ['setup'] },
    {
      name: 'desktop-chrome',
      testMatch: /ui\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: STAFF_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      testMatch: /ui\/.*\.spec\.ts/,
      use: { ...devices['Pixel 7'], storageState: STAFF_STATE },
      dependencies: ['setup'],
    },
    { name: 'sms-contract', testMatch: /contract\/.*\.spec\.ts/ },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: CI ? 'pnpm start' : 'pnpm dev',
        url: 'http://localhost:3000/api/health',
        reuseExistingServer: !CI,
        timeout: 120_000,
        env: { ALLOW_TEST_CLOCK: 'true' },
      },
});
