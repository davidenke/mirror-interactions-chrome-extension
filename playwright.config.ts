import { env } from 'node:process';

import { defineConfig } from '@playwright/test';

// env.PW_CHROMIUM_ATTACH_TO_OTHER = '1';
// env.PW_DEBUG = '1';

// https://playwright.dev/docs/test-configuration
export default defineConfig({
  testDir: './tests',
  // as our tests are most likely a bit more complex, the default
  // timeout of 30 seconds would be reached quite often
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!env.CI,
  retries: env.CI ? 2 : 0,
  workers: env.CI ? '50%' : '75%',
  reporter: env.CI
    ? [['list'], ['html', { outputFolder: 'reports/html', open: 'never' }]]
    : // use console, either `dot`, `line` or `list`
      [['list']],
  outputDir: 'reports/playwright',
  // defines the url for testing
  use: {
    // we'll use a context router for `localhost/test` to proxy requests to
    // the static `playwright.test.html`, so the host could be anything else
    baseURL: 'http://localhost',
    // create a trace if test failed
    trace: 'retain-on-failure',
  },
  // start the dev server of the extension silently
  webServer: { command: 'npm run dev -- --logLevel silent' },
});
