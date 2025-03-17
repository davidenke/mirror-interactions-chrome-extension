import { expect, test } from '../playwright.fixtures.js';

test('is turned off by default', async ({ extension, page }) => {
  await page.goto('/test', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Hello World!', level: 1 }).waitFor();

  const syncMode = await extension.getSyncMode();
  expect(syncMode).toBe('off');
});

test('cycles through modes on each icon click', async ({ extension, page }) => {
  await page.goto('/test', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Hello World!', level: 1 }).waitFor();

  await extension.clickIcon();
  expect(await extension.getSyncMode()).toBe('send');

  await extension.clickIcon();
  expect(await extension.getSyncMode()).toBe('receive');

  await extension.clickIcon();
  expect(await extension.getSyncMode()).toBe('off');
});
