import type { Message } from '../constants';

declare global {
  interface Window {
    ___MICE_receive?: () => void;
  }
}

/**
 * This function must be self contained, as it is injected in the
 * page context as content script; to use imports and/or external
 * dependencies, this must be bundled explicitly.
 */
export function startReceive() {
  // am I supposed to do anything?
  if (window.___MICE_receive !== undefined) return;

  // prepare ghost
  const cursor = document.createElement('div');
  cursor.style.position = 'fixed';
  cursor.style.pointerEvents = 'none';
  cursor.style.width = '20px';
  cursor.style.height = '20px';
  cursor.style.display = 'none';
  cursor.style.borderRadius = '50%';
  cursor.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
  cursor.style.border = '2px solid rgba(255, 0, 0, 0.75)';
  cursor.style.transform = 'translate(-50%, -50%)';
  cursor.style.zIndex = '999999';
  document.body.appendChild(cursor);

  // start receiving events
  const receiveListener = (message: Message) => {
    switch (message.type) {
      case 'MICE_CursorPosition': {
        const { x, y } = message.payload;
        cursor.style.display = 'block';
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
        break;
      }
    }
    return false;
  };

  // assign listener
  chrome.runtime.onMessage.addListener(receiveListener);

  // global clean up function
  window.___MICE_receive = () => {
    // remove all listeners and ghosts
    chrome.runtime.onMessage.removeListener(receiveListener);
    cursor.remove();

    // Honestly, I didn't touch anything here...
    delete window.___MICE_receive;
  };

  // clean up when content script gets disconnected
  chrome.runtime.connect().onDisconnect.addListener(() => window.___MICE_receive?.());
}

/**
 * This function must be self contained, as it is injected in the
 * page context as content script; to use imports and/or external
 * dependencies, this must be bundled explicitly.
 */
export function stopReceive() {
  window.___MICE_receive?.();
}
