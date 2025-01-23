import type { KeyInput } from 'puppeteer-core';

import type { Click, CommandKey, Cursor, KeyCmd, KeyPress, Wheel } from '../constants.js';
import { COMMAND_KEYS } from '../constants.js';

declare global {
  interface Window {
    ___MICE_send?: () => void;
  }
}

/**
 * This function must be self contained, as it is injected in the
 * page context as content script; to use imports and/or external
 * dependencies, this must be bundled explicitly.
 */
export function startSend() {
  // clean up previous
  window.___MICE_send?.();

  // prepare listeners
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listeners = new Map<keyof WindowEventMap, (event: any) => any>();

  // capture pointer position and send it to worker
  // to be shared across selected mirror tabs
  listeners.set('mousemove', ({ clientX: x, clientY: y }: MouseEvent) => {
    chrome.runtime.sendMessage({ type: 'MICE_Cursor', payload: { x, y } } satisfies Cursor);
  });

  // capture click or touch events and send them to worker
  listeners.set('click', (event: MouseEvent | TouchEvent) => {
    const { clientX: x, clientY: y } = 'touches' in event ? event.touches[0] : event;
    chrome.runtime.sendMessage({ type: 'MICE_Click', payload: { x, y } } satisfies Click);
  });

  listeners.set('keypress', (event: KeyboardEvent) => {
    const key = event.key as KeyInput;
    if (COMMAND_KEYS.includes(key as CommandKey)) return;
    chrome.runtime.sendMessage({ type: 'MICE_KeyPress', payload: { key } } satisfies KeyPress);
  });
  listeners.set('keydown', (event: KeyboardEvent) => {
    const { key, altKey, ctrlKey, metaKey, shiftKey } = event;
    if (!COMMAND_KEYS.includes(key as CommandKey)) return;
    const payload = { key: key as CommandKey, altKey, ctrlKey, metaKey, shiftKey };
    chrome.runtime.sendMessage({ type: 'MICE_KeyCmd', payload } satisfies KeyCmd);
  });

  // capture wheel events and send them to worker
  listeners.set('wheel', (event: WheelEvent) => {
    const { clientX: x, clientY: y, deltaX: dx, deltaY: dy } = event;
    chrome.runtime.sendMessage({ type: 'MICE_Wheel', payload: { x, y, dx, dy } } satisfies Wheel);
  });

  // start sending the events
  listeners.forEach((listener, name) => {
    window.addEventListener(name, listener);
  });

  // global clean up function
  window.___MICE_send = () => {
    // remove all listeners
    listeners.forEach((fn, name) => window.removeEventListener(name, fn));
  };
}

/**
 * This function must be self contained, as it is injected in the
 * page context as content script; to use imports and/or external
 * dependencies, this must be bundled explicitly.
 */
export function stopSend() {
  window.___MICE_send?.();
}
