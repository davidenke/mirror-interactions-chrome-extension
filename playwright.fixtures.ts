import { env } from 'node:process';
import { fileURLToPath } from 'node:url';

import type { BrowserContext, Page, Worker } from '@playwright/test';
import { chromium, expect as baseExpect, test as baseTest } from '@playwright/test';

import type { SyncMode } from './src/constants.js';
import { SYNC_MODE } from './src/constants.js';

export class MirrorExtensionFixture {
  readonly #worker: Worker;

  get id(): string {
    const [, , extensionId] = this.#worker.url().split('/');
    return extensionId;
  }

  /**
   * Waits for the extension to be ready, as the chrome apis are not available immediately.
   * Without, one may encounter exceptions like `query is not defined on chrome.tabs`.
   *
   * We do so by polling for a known API property to be present in the `chrome` global.
   */
  get ready(): Promise<void> {
    return new Promise(resolve => {
      const checkReadiness = async () => {
        const ready = await this.#worker.evaluate(() => 'runtime' in chrome);
        if (ready) resolve();
        else setTimeout(checkReadiness, 100);
      };
      checkReadiness();
    });
  }

  constructor(worker: Worker) {
    this.#worker = worker;
  }

  /**
   * Conveniently access the current tab state
   */
  async getSyncMode(): Promise<SyncMode> {
    const tabId = await this.#worker.evaluate(async () => {
      const [{ id }] = await chrome.tabs.query({ active: true });
      return id;
    });
    if (!tabId) throw new Error('No active tab found');
    const { tabState } = await this.#worker.evaluate(() => chrome.storage.session.get('tabState'));
    return tabState[tabId]?.syncMode;
  }

  /**
   * Reset the current tab state (for cleanup)
   */
  teardown(): Promise<void> {
    return this.#worker.evaluate(() => chrome.storage.session.remove('tabState'));
  }

  /**
   * Cycles through the extension modes, from 'off' to 'send' to 'receive'.
   * @fixme clicking the icon implies some async behavior, which is not
   *        awaited properly yet, but handled with a timeout...
   */
  async clickIcon(waitAfter = 1234): Promise<number> {
    const tabId = await this.#worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ active: true });
      await chrome.action.onClicked.dispatch(tab);
      return tab.id;
    });
    if (!tabId) throw new Error('No active tab found');
    await new Promise(resolve => setTimeout(resolve, waitAfter));
    return tabId;
  }

  /**
   * As the extension cycles through the modes, we provide this util to chose a specific one.
   * It simply clicks the icon until the desired mode is reached.
   * To prevent infinite loops, the amount of tries can be limited. By default, it's the amount of available modes +1.
   */
  async setMode(mode: SyncMode, tries: number = SYNC_MODE.length + 1): Promise<void> {
    if (tries <= 0) throw new Error('Could not set mode');

    const syncMode = await this.getSyncMode();
    if (syncMode === mode) return;

    await this.clickIcon();
    return this.setMode(mode, --tries);
  }
}

export const test = baseTest.extend<{
  context: BrowserContext;
  extension: MirrorExtensionFixture;
  setupPages: (path: string) => Promise<{ sender: Page; receiver: Page }>;
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
      headless: !env.PW_DEBUG,
    });

    if (env.PW_DEBUG) {
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
    }

    // redirect /test to the static test file
    await context.route('/test', route => {
      if (route.request().resourceType() !== 'document') return;
      route.fulfill({ path: fileURLToPath(new URL('./playwright.test.html', import.meta.url)) });
    });

    // run tests
    await use(context);

    // teardown
    await context.close();
    await context.browser()?.close();
  },

  // retrieve the extension id from the background page
  extension: async ({ context }, use) => {
    // get the background page
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent('serviceworker');

    // prepare the fixture
    const extension = new MirrorExtensionFixture(worker);
    await extension.ready;

    // run tests
    await use(extension);

    // teardown
    await extension.teardown();
  },

  // provide a function to setup test pages; a sending and a receiving one
  setupPages: [
    async ({ context, extension, page }, use) => {
      let sender: Page | undefined;
      let receiver: Page | undefined;

      // pass a factory function to create the sender and receiver pages to the tests
      await use(async (path: string) => {
        // prepare sender
        sender = page;
        await sender.bringToFront();
        await sender.goto(path);
        await extension.setMode('send');

        // prepare receiver
        receiver = await context.newPage();
        await receiver.bringToFront();
        await receiver.goto(path);
        await extension.setMode('receive');

        // deliver the pages
        return { sender, receiver };
      });

      // teardown
      await receiver?.close();
      await sender?.close();
    },
    { scope: 'test', title: 'setup sending and receiving pages' },
  ],
});

export const expect = baseExpect.extend({});
