import type { ClickOrTouch, CursorPosition, Wheel } from '../constants.js';

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
  // am I supposed to do anything?
  if (window.___MICE_send !== undefined) return;

  // prepare listeners
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listeners = new Map<keyof WindowEventMap, (event: any) => any>();

  // capture pointer position and send it to worker
  // to be shared across selected mirror tabs
  listeners.set('mousemove', ({ clientX: x, clientY: y }: MouseEvent) => {
    chrome.runtime.sendMessage({
      type: 'MICE_CursorPosition',
      payload: { x, y },
    } satisfies CursorPosition);
  });

  // capture click or touch events and send them to worker
  listeners.set('click', (event: MouseEvent | TouchEvent) => {
    const { clientX: x, clientY: y } = 'touches' in event ? event.touches[0] : event;
    chrome.runtime.sendMessage({
      type: 'MICE_ClickOrTouch',
      payload: { x, y },
    } satisfies ClickOrTouch);
  });

  // capture wheel events and send them to worker
  listeners.set('wheel', (event: WheelEvent) => {
    const { clientX: x, clientY: y, deltaX: dx, deltaY: dy } = event;
    chrome.runtime.sendMessage({
      type: 'MICE_Wheel',
      payload: { x, y, dx, dy },
    } satisfies Wheel);
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

  // clean up when content script gets disconnected
  chrome.runtime.connect().onDisconnect.addListener(() => window.___MICE_send?.());
}

/**
 * This function must be self contained, as it is injected in the
 * page context as content script; to use imports and/or external
 * dependencies, this must be bundled explicitly.
 */
export function stopSend() {
  window.___MICE_send?.();
}
