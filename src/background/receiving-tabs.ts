import type { Browser } from 'puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser';
import {
  connect,
  ExtensionTransport,
} from 'puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser';

// while individual tab states are persisted in session storage,
// the currently receiving tabs are stored in memory along with
// the attached puppeteer instances
const _receivingTabs = new Map<number, Browser>();

// the tabs need to be cleaned up by checking against the current tabs
export async function cleanupReceivingTabs() {
  await Promise.all(
    _receivingTabs.keys().map(async tabId => {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab === undefined) deleteReceivingTab(tabId);
      } catch (error) {
        deleteReceivingTab(tabId);
      }
    }),
  );
}

export async function setReceivingTab(tabId: number, disconnect: () => void) {
  // are we connected already?
  if (_receivingTabs.get(tabId)?.connected) return;

  // connect puppeteer to the receiving tab and prevent the viewport from being resized
  // https://github.com/puppeteer/puppeteer/issues/3688#issuecomment-453218745
  const transport = await ExtensionTransport.connectTab(tabId);
  const browser = await connect({ transport, defaultViewport: null });
  browser.on('disconnected', () => disconnect());
  console.info(`[MICE] pulling the strings: ${tabId}`);
  _receivingTabs.set(tabId, browser);
}

export function deleteReceivingTab(tabId: number) {
  if (_receivingTabs.has(tabId)) console.info(`[MICE] loosing strings: ${tabId}`);
  _receivingTabs.get(tabId)?.disconnect();
  _receivingTabs.delete(tabId);
}

export function invokeReceivingTabs(fn: (browser: Browser, tabId: number) => Promise<void> | void) {
  cleanupReceivingTabs().then(() => _receivingTabs.forEach(fn));
}
