import type { SyncMode } from '../constants.js';

type TabState = { syncMode: SyncMode };

export async function getTabState(tabId?: number): Promise<TabState | undefined> {
  if (tabId === undefined) return;
  const { tabState = {} } = await chrome.storage.session.get('tabState');
  return tabState[tabId];
}

export async function setTabState(tabId: number, state: TabState): Promise<void> {
  const { tabState = {} } = await chrome.storage.session.get('tabState');
  tabState[tabId] = state;
  return chrome.storage.session.set({ tabState });
}

export async function removeTabState(tabId: number): Promise<void> {
  const { tabState = {} } = await chrome.storage.session.get('tabState');
  delete tabState[tabId];
  return chrome.storage.session.set({ tabState });
}

// set the extension icon
export async function setIcon(tabId: number, icon: 'disabled' | 'off' | 'receive' | 'send') {
  return chrome.action?.setIcon({
    tabId,
    path: {
      16: `icons/icon-${icon}-16.png`,
      32: `icons/icon-${icon}-32.png`,
      48: `icons/icon-${icon}-48.png`,
      128: `icons/icon-${icon}-128.png`,
    },
  });
}
