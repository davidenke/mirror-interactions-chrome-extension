import { env } from 'node:process';
import { fileURLToPath } from 'node:url';

import type { BrowserContext, Worker } from '@playwright/test';
import { chromium, test as base } from '@playwright/test';

import type { TabState } from './src/background/tab-state.js';

env.PW_CHROMIUM_ATTACH_TO_OTHER = '1';

export class MirrorExtension {
  readonly #background: Worker;

  constructor(
    public readonly id: string,
    worker: Worker,
  ) {
    this.#background = worker;
  }

  /**
   * Conveniently access the current tab state
   */
  async getTabState(): Promise<TabState> {
    return this.#background.evaluate(
      () =>
        new Promise(resolve =>
          chrome.tabs.query({ active: true }, async ([tab]) => {
            const { tabState } = await chrome.storage.session.get('tabState');
            resolve(tabState[tab.id!]);
          }),
        ),
    );
  }

  /**
   * Cycles through the extension modes, from 'off' to 'send' to 'receive'.
   */
  async clickIcon(): Promise<chrome.tabs.Tab> {
    return this.#background.evaluate(
      () =>
        new Promise(resolve => {
          chrome.tabs.query({ active: true }, ([tab]) => {
            // clicking the icon will somehow trigger a storage event we have to wait for
            chrome.storage.session.onChanged.addListener(() => resolve(tab));
            // force the click event by dispatching it (undocumented and untyped API)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (chrome.action.onClicked as any).dispatch(tab);
          });
        }),
    );
  }
}

export const test = base.extend<{
  context: BrowserContext;
  extension: MirrorExtension;
}>({
  // prepare a unique context with our extension loaded
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    // launch chromium with the extension loaded
    const pathToExtension = fileURLToPath(new URL('./dist', import.meta.url));
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        // https://gist.github.com/dodying/34ea4760a699b47825a766051f47d43b
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
      headless: false,
    });

    // extension is after the blank ghost page
    // see issue https://github.com/microsoft/playwright-python/issues/689
    const [page] = context.pages();

    // got to the extensions page
    await page.goto('chrome://extensions');

    // activate developer mode
    const developerMode = page.getByRole('button', { name: 'Entwicklermodus' });
    const developerModeActive = await developerMode.getAttribute('aria-pressed');
    if (developerModeActive === 'false') await developerMode.click();

    // go to the extensions settings page
    await page
      .locator('extensions-item')
      .filter({ hasText: 'Mirror viewport interactions' })
      .getByRole('button', { name: 'Details' })
      .click();

    // pin the extension to the toolbar
    const pinExtension = page.getByRole('button', { name: 'An Symbolleiste anpinnen' });
    const extensionPinned = await pinExtension.getAttribute('aria-pressed');
    if (extensionPinned === 'false') await pinExtension.click();

    // allow extension in incognito mode
    const incognitoMode = page.getByRole('button', { name: 'Im Inkognitomodus zulassen' });
    const incognitoModeAllowed = await incognitoMode.getAttribute('aria-pressed');
    if (incognitoModeAllowed === 'false') await incognitoMode.click();

    // redirect /test to the static test file
    await context.route('/test', route =>
      route.fulfill({ path: fileURLToPath(new URL('./playwright.test.html', import.meta.url)) }),
    );

    // run tests
    await use(context);
    await context.close();
  },

  // retrieve the extension id from the background page
  extension: async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background) background = await context.waitForEvent('serviceworker');

    const [, , extensionId] = background.url().split('/');
    const extension = new MirrorExtension(extensionId, background);
    await use(extension);
  },
});

export const expect = test.expect;
