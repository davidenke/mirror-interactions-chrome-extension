import type { Message, Mode, SyncMode, Which } from './constants.js';
import { startReceive, stopReceive } from './mode/receive.js';
import { startSend, stopSend } from './mode/send.js';

// depending on the mode, start or stop sending or receiving events; they will
// be called an unpredictable amount of times, thus, the content script functions
// check themselves if they are already running in the context, or not
function handleModeChange(mode: SyncMode) {
  switch (mode) {
    case 'send':
      stopReceive();
      startSend();
      console.info('MICE is sending');
      break;

    case 'receive':
      stopSend();
      startReceive();
      console.info('MICE is receiving');
      break;

    case 'off':
    default:
      stopReceive();
      stopSend();
      console.info('MICE is off');
      break;
  }
}

// when the mode changes, handle it
chrome.runtime.onMessage.addListener((message: Message) => {
  if (message.type === 'MICE_Mode') {
    handleModeChange(message.payload.mode);
  }
  // no response to wait for
  return false;
});

// ask initially for the current mode
document.addEventListener(
  'DOMContentLoaded',
  () => chrome.runtime.sendMessage({ type: 'MICE_Which' } as Which),
  { once: true, passive: true },
);
