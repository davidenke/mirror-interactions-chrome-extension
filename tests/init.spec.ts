import { expect, test } from '../playwright.fixtures.js';

test.describe('init', () => {
  // Chrome might change the cli arguments to start with a loaded extension,
  // so we want to make sure the extension is loaded correctly beforehand.
  test('should work', async ({ page }) => {
    await page.goto('/test');
    await expect(page.getByRole('heading', { name: 'Hello World!', level: 1 })).toBeVisible();
  });
});
