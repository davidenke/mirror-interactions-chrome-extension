import type { KeyInput } from 'puppeteer-core';

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
  // clean up previous
  window.___MICE_receive?.();

  // prepare ghosts
  let cursorTimeout: number;
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

  let kbdTimeout: number;
  const kbd = document.createElement('div');
  kbd.style.position = 'fixed';
  kbd.style.inset = 'auto auto 20px 20px';
  kbd.style.padding = '2px 5px';
  kbd.style.borderRadius = '5px';
  kbd.style.backgroundColor = '#3c3c3c';
  kbd.style.border = '2px solid #454746';
  kbd.style.color = '#f4f4f4';
  kbd.style.font =
    '12px/1 system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';
  kbd.style.pointerEvents = 'none';
  kbd.style.opacity = '0';
  kbd.style.transition = 'opacity 0.5s';
  kbd.style.zIndex = '999998';
  document.body.appendChild(kbd);

  // start receiving events
  const receiveListener = (message: Message) => {
    switch (message?.type) {
      case 'MICE_Cursor': {
        const { x, y } = message.payload;
        cursor.style.display = 'block';
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
        cursor.style.opacity = '1';

        window.clearTimeout(cursorTimeout);
        cursorTimeout = window.setTimeout(() => (cursor.style.opacity = '0'), 2000);
        break;
      }

      case 'MICE_KeyCmd': {
        // keyboard interaction hide cursor
        cursor.style.opacity = '0';

        const { key, altKey, ctrlKey, metaKey, shiftKey } = message.payload;
        const keys: KeyInput[] = [key];
        if (altKey) keys.push('Alt');
        if (ctrlKey) keys.push('Control');
        if (metaKey) keys.push('Meta');
        if (shiftKey) keys.push('Shift');

        kbd.innerHTML = keys
          .map(key => {
            let label: string = key;
            if (key === ' ') label = 'Space';
            if (key === 'Enter') label = '↵';
            const k = document.createElement('kbd');
            k.style.all = 'unset';
            k.style.color = 'inherit';
            k.style.display = 'inline-block';
            k.style.font = 'inherit';
            k.textContent = label;
            return k.outerHTML;
          })
          .join(' + ');
        kbd.style.opacity = '1';

        window.clearTimeout(kbdTimeout);
        kbdTimeout = window.setTimeout(() => (kbd.style.opacity = '0'), 1000);
        break;
      }

      case 'MICE_KeyPress': {
        // keyboard interaction hide cursor
        cursor.style.opacity = '0';
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
    kbd.remove();

    // Honestly, I didn't touch anything here...
    delete window.___MICE_receive;
  };
}

/**
 * This function must be self contained, as it is injected in the
 * page context as content script; to use imports and/or external
 * dependencies, this must be bundled explicitly.
 */
export function stopReceive() {
  window.___MICE_receive?.();
}
