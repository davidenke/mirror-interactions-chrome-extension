import type { KeyInput } from 'puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js';

import {
  deleteReceivingTab,
  invokeReceivingTabs,
  setReceivingTab,
} from './background/receiving-tabs.js';
import {
  clearTabState,
  getTabState,
  removeTabState,
  setIcon,
  setTabState,
} from './background/tab-state.js';
import type { Message, Mode, SyncMode } from './constants.js';
import { ALLOWED_PROTOCOLS, PREFIX, prefix, SYNC_MODE } from './constants.js';

// set and store the mode of the tab and connect puppeteer if necessary
export async function setSyncMode(tabId: number, mode: SyncMode) {
  // skip tabs with not allowed protocols in url
  const { url } = await chrome.tabs.get(tabId);
  const isAllowedUrl = ALLOWED_PROTOCOLS.some(protocol => url?.startsWith(protocol));
  if (!isAllowedUrl) {
    // remove the tab state and set the icon to disabled
    await removeTabState(tabId);
    return setIcon(tabId, 'disabled');
  }

  if (mode === 'receive') {
    await setReceivingTab(tabId, () => setSyncMode(tabId, 'off'));
  } else {
    deleteReceivingTab(tabId);
  }

  // notify the content script about the eventually changed mode
  // if it can be reached; encountering stalled or inactive tabs
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'MICE_Mode', payload: { mode } } as Mode);
  } catch (error) {
    // no-op
  }

  // set the (new) state and icon
  await setTabState(tabId, { syncMode: mode });
  await setIcon(tabId, mode);
}

// prepare the tab state, by default new tabs are in off mode
export async function initializeTabState(tabId: number) {
  // if an already known tab is handled (most common case),
  // refresh the icon if necessary, otherwise set it to off
  const { syncMode = 'off' } = (await getTabState(tabId)) ?? {};
  return setSyncMode(tabId, syncMode);
}

// remove the tab state and clean up when the tab is closed
chrome.tabs.onRemoved.addListener(async tabId => {
  deleteReceivingTab(tabId);
  removeTabState(tabId);
});

// register tab events
chrome.tabs.onCreated.addListener(async tab => initializeTabState(tab.id!));
chrome.tabs.onActivated.addListener(async ({ tabId }) => initializeTabState(tabId));
chrome.tabs.onUpdated.addListener(async tabId => initializeTabState(tabId));
chrome.runtime.onInstalled.addListener(async () => {
  await clearTabState();
  const tabs = await chrome.tabs.query({});
  return Promise.all(tabs.map(tab => initializeTabState(tab.id!)));
});

// handle extension icon click
chrome.action?.onClicked.addListener(async tab => {
  // cycle tab sync mode
  let { syncMode = 'off' } = (await getTabState(tab.id!)) ?? {};
  const index = (SYNC_MODE.indexOf(syncMode) + 1) % SYNC_MODE.length;
  syncMode = SYNC_MODE[index];

  // update the icon for the tab
  await setSyncMode(tab.id!, syncMode);
});

// proxy messages from sending to receiving content scripts
chrome.runtime.onMessage.addListener((message: Message, { tab }) => {
  // filter out events from foreign scopes
  if (!message.type.startsWith(PREFIX)) return;

  switch (message.type) {
    // deliver the requested mode for the tab when requested; this
    // also means, that the tab could have been refreshed / reloaded
    case prefix('Which'):
      if (!tab?.id) return false;
      (async () => {
        // do not respond directly, to allow refreshing the extension icon
        // or the puppeteer connection by the `setSyncMode` function
        const { syncMode = 'off' } = (await getTabState(tab.id)) ?? {};
        setSyncMode(tab.id!, syncMode);
      })();
      break;

    // handle cursor position
    case prefix('Cursor'):
      invokeReceivingTabs(async (browser, tabId) => {
        // forward the message to all receiving tabs to show the ghost cursor
        chrome.tabs.sendMessage(tabId, message);

        // move the virtual cursor using puppeteer to show hover states
        const [page] = await browser.pages();
        const { x, y } = message.payload;
        await page.mouse.move(x, y);
      });
      break;

    // simulate click at position using puppeteer
    case prefix('Click'):
      invokeReceivingTabs(async browser => {
        const [page] = await browser.pages();
        const { x, y } = message.payload;
        await page.mouse.click(x, y);
      });
      break;

    // handle keyboard commands
    case prefix('KeyCmd'):
      invokeReceivingTabs(async (browser, tabId) => {
        // forward the message to all receiving tabs to show an input hint
        chrome.tabs.sendMessage(tabId, message);

        // send a keyboard command using puppeteer
        const [page] = await browser.pages();
        const { key, altKey, ctrlKey, metaKey, shiftKey } = message.payload;
        const modifiers: KeyInput[] = [];
        if (altKey) modifiers.push('Alt');
        if (ctrlKey) modifiers.push('Control');
        if (metaKey) modifiers.push('Meta');
        if (shiftKey) modifiers.push('Shift');

        modifiers.forEach(async modifier => await page.keyboard.down(modifier));
        await page.keyboard.press(key);
        modifiers.forEach(async modifier => await page.keyboard.up(modifier));
      });
      break;

    // simulate key press using puppeteer
    case prefix('KeyPress'):
      invokeReceivingTabs(async (browser, tabId) => {
        // forward the message to all receiving tabs to hide ghost cursor
        chrome.tabs.sendMessage(tabId, message);

        const [page] = await browser.pages();
        const { key } = message.payload;
        await page.keyboard.sendCharacter(key);
      });
      break;

    // simulate scroll at position using puppeteer
    case prefix('Wheel'):
      invokeReceivingTabs(async browser => {
        const [page] = await browser.pages();
        const { x, y, dx, dy } = message.payload;
        await page.mouse.move(x, y);
        await page.mouse.wheel({ deltaX: dx, deltaY: dy });
      });
      break;
  }

  // no async response
  return false;
});
