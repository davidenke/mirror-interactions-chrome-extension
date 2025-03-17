import type { SyncMode } from '../constants.js';

export type TabState = { syncMode: SyncMode };

export const ICON_SIZES = [16, 32, 48, 128] as const;

export async function clearTabState(): Promise<void> {
  return chrome.storage.session.remove('tabState');
}

export async function getTabState(tabId?: number): Promise<TabState | undefined> {
  // we need an id of an actual existing tab
  if (tabId === undefined) return;
  const tab = await chrome.tabs.get(tabId);
  if (tab === undefined) await removeTabState(tabId);

  // read the tab state from session storage
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
export async function setIcon(
  tabId: number | undefined,
  icon: 'disabled' | 'off' | 'receive' | 'send',
) {
  // we need an id of an actual existing tab
  if (tabId === undefined) return;
  const tab = await chrome.tabs.get(tabId);
  if (tab === undefined) return;

  // set the icon for the tab
  chrome.action?.setIcon({
    tabId,
    path: ICON_SIZES.reduce(
      (icons, size) => ({ ...icons, [size]: `icons/icon-${icon}-${size}.png` }),
      {} as Record<number, string>,
    ),
  });
}
