import config from '@davidenke/lint';
import type { Linter } from 'eslint';
import playwright from 'eslint-plugin-playwright';

export default [
  ...config,
  {
    ...playwright.configs['flat/recommended'],
    files: ['tests/**'],
    rules: {
      // prevent using improper imports
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'playwright/test',
              importNames: ['expect', 'test'],
              message: 'Please import from playwrigh.fixtures.js instead',
            },
            {
              name: '@playwright/test',
              importNames: ['expect', 'test'],
              message: 'Please import from playwrigh.fixtures.js instead',
            },
          ],
        },
      ],

      // Playwright best-practices - recommended
      ...playwright.configs['flat/recommended'].rules,

      // Playwright best-practices - common
      'playwright/no-commented-out-tests': 'error',
      'playwright/no-get-by-title': 'error',

      // Playwright best-practices - high-level-api instead of `.locator`
      'playwright/prefer-locator': 'error',
      'playwright/no-raw-locators': 'error',
      'playwright/prefer-native-locators': 'error',

      // Playwright best-practices - hooks placement and order
      'playwright/prefer-hooks-in-order': 'error',
      'playwright/prefer-hooks-on-top': 'error',

      // Playwright best-practices - correct matcher usage
      'playwright/prefer-comparison-matcher': 'error',
      'playwright/prefer-equality-matcher': 'error',
      'playwright/prefer-strict-equal': 'error',
      'playwright/prefer-to-be': 'error',
      'playwright/prefer-to-contain': 'error',
      'playwright/prefer-to-have-count': 'error',
      'playwright/prefer-to-have-length': 'error',
    },
  },
] satisfies Linter.Config[];
