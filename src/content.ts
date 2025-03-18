import type { Message, SyncMode, Which } from './constants.js';
import { startReceive, stopReceive } from './content/receive.js';
import { startSend, stopSend } from './content/send.js';

declare global {
  interface Window {
    ___MICE_debug?: true;
    ___MICE_mode?: SyncMode;
  }
}

// depending on the mode, start or stop sending or receiving events; they will
// be called an unpredictable amount of times, thus, the content script functions
// check themselves if they are already running in the context, or not
function handleModeChange(mode: SyncMode) {
  // skip duplicate mode changes
  if (window.___MICE_mode === mode) return;
  window.___MICE_mode = mode;

  switch (mode) {
    case 'send':
      stopReceive();
      startSend();
      break;

    case 'receive':
      stopSend();
      startReceive();
      break;

    case 'off':
    default:
      stopReceive();
      stopSend();
      break;
  }
}

(() => {
  // set initial mode to off
  if (!window.___MICE_mode) window.___MICE_mode = 'off';

  // when the mode changes, handle it
  chrome.runtime.onMessage.addListener((message: Message) => {
    if (message.type === 'MICE_Mode') {
      handleModeChange(message.payload.mode);

      if (window.___MICE_debug) {
        console.info(`[MICE] mode: ${message.payload.mode}`);
      }
    }
    // no response to wait for
    return false;
  });

  // ask initially for the current mode
  chrome.runtime.sendMessage({ type: 'MICE_Which' } as Which);
})();
