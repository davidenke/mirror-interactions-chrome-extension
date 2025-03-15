import { env } from 'node:process';

import { defineConfig } from '@playwright/test';

// https://playwright.dev/docs/test-configuration
export default defineConfig({
  testDir: './tests',
  // as our tests are most likely a bit more complex, the default
  // timeout of 30 seconds would be reached quite often
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!env.CI,
  retries: env.CI ? 2 : 0,
  workers: 1,
  reporter: env.CI
    ? [['html', { outputFolder: 'reports/html', open: 'never' }]]
    : // use console, either `dot`, `line` or `list`
      [['list']],
  outputDir: 'reports/playwright',
  // defines the url for testing
  use: {
    baseURL: 'http://localhost',
    // create a trace if test failed
    trace: 'retain-on-failure',
  },
  // start the dev server to build the extension
  webServer: { command: 'npm run dev' },
});
