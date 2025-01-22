import type { Browser, KeyInput } from 'puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js';
import {
  connect,
  ExtensionTransport,
} from 'puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js';

import { getTabState, removeTabState, setIcon, setTabState } from './background/tab-state.js';
import type { Message, SyncMode } from './constants.js';
import { ALLOWED_PROTOCOLS, COMMAND_KEYS, PREFIX, prefix, SYNC_MODE } from './constants.js';
import { startReceive, stopReceive } from './mode/receive.js';
import { startSend, stopSend } from './mode/send.js';

// while individual tab states are persisted in session storage,
// the currently receiving tabs are stored in memory along with
// the attached puppeteer instances
const receivingTabs = new Map<number, Browser>();

// set the extension mode
export async function setSyncMode(tabId: number, mode: SyncMode) {
  // skip tabs with not allowed protocols in url
  const { url } = await chrome.tabs.get(tabId)!;
  const isAllowedUrl = ALLOWED_PROTOCOLS.some(protocol => url?.startsWith(protocol));
  if (!isAllowedUrl) {
    // remove the tab state and set the icon to disabled
    await removeTabState(tabId);
    return setIcon(tabId, 'disabled');
  }

  // run associated mode logic to inject the content script
  switch (mode) {
    case 'receive': {
      // connect puppeteer to the receiving tab and prevent the viewport from being resized
      // https://github.com/puppeteer/puppeteer/issues/3688#issuecomment-453218745
      const transport = await ExtensionTransport.connectTab(tabId);
      const browser = await connect({ transport, defaultViewport: null });
      browser.on('disconnected', () => setSyncMode(tabId, 'off'));
      receivingTabs.set(tabId, browser);

      await chrome.scripting.executeScript({ target: { tabId }, func: stopSend });
      await chrome.scripting.executeScript({ target: { tabId }, func: startReceive });
      break;
    }

    case 'send':
      await receivingTabs.get(tabId)?.disconnect();
      receivingTabs.delete(tabId);

      await chrome.scripting.executeScript({ target: { tabId }, func: stopReceive });
      await chrome.scripting.executeScript({
        target: { tabId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        func: startSend as any,
        args: [COMMAND_KEYS],
      });
      break;

    case 'off':
    default:
      await receivingTabs.get(tabId)?.disconnect();
      receivingTabs.delete(tabId);

      await chrome.scripting.executeScript({ target: { tabId }, func: stopReceive });
      await chrome.scripting.executeScript({ target: { tabId }, func: stopSend });
      break;
  }

  // set the new state and icon
  await setTabState(tabId, { syncMode: mode });
  return setIcon(tabId, mode);
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
  await chrome.scripting.executeScript({ target: { tabId }, func: stopReceive });
  await chrome.scripting.executeScript({ target: { tabId }, func: stopSend });
  removeTabState(tabId);
});

// register tab events
chrome.tabs.onCreated.addListener(async tab => initializeTabState(tab.id!));
chrome.tabs.onActivated.addListener(async ({ tabId }) => initializeTabState(tabId));
chrome.tabs.onUpdated.addListener(async tabId => initializeTabState(tabId));
chrome.runtime.onInstalled.addListener(async () => {
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
chrome.runtime.onMessage.addListener((message: Message) => {
  // filter out events from foreign scopes
  if (!message.type.startsWith(PREFIX)) return;

  switch (message.type) {
    // handle cursor position
    case prefix('Cursor'):
      receivingTabs.forEach(async (browser, tabId) => {
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
      receivingTabs.forEach(async browser => {
        const [page] = await browser.pages();
        const { x, y } = message.payload;
        await page.mouse.click(x, y);
      });
      break;

    // handle keyboard commands
    case prefix('KeyCmd'):
      receivingTabs.forEach(async (browser, tabId) => {
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
      receivingTabs.forEach(async (browser, tabId) => {
        // forward the message to all receiving tabs to hide ghost cursor
        chrome.tabs.sendMessage(tabId, message);

        const [page] = await browser.pages();
        const { key } = message.payload;
        await page.keyboard.sendCharacter(key);
      });
      break;

    // simulate scroll at position using puppeteer
    case prefix('Wheel'):
      receivingTabs.forEach(async browser => {
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
