declare namespace chrome {
  declare namespace events {
    declare interface Event {
      /**
       * An undocumented and untyped method allowing us to dispatch events.
       * @url https://github.com/puppeteer/puppeteer/issues/2486#issuecomment-1304647395
       * @param tab
       * @experimental This might break any time, as this is not an official API.
       * @deprecated (to mark the usage of this method as strike through)
       */
      dispatch(tab: chrome.tabs.Tab): Promise<void>;
    }
  }
}
