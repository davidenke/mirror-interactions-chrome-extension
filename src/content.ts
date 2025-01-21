// const src = chrome.runtime.getURL('src/content-script/iframe/index.html');

// const iframe = new DOMParser().parseFromString(
//   `<iframe class="crx-iframe" src="${src}"></iframe>`,
//   'text/html',
// ).body.firstElementChild;

// if (iframe) {
//   document.body?.append(iframe);
// }

console.info('Content script loaded');

self.onerror = function (message, source, lineno, colno, error) {
  console.info(
    `Error: ${message}\nSource: ${source}\nLine: ${lineno}\nColumn: ${colno}\nError object: ${error}`,
  );
};
