# Mirror Interactions Chrome Extension

This is a Chrome extension that allows you to mirror interactions between tabs. This is useful for e.g.:

- searching visuell regressions
- comparing differences between versions of the same page
- showcasing a website in multiple languages simultaneously
- presenting bug reproductions before and after a fix

## Development

This extension is built with [TypeScript](https://www.typescriptlang.org/) and prepared with the [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin). It uses [Puppeteer](https://pptr.dev/) to interact with the remote tabs.

#### tl;dr

```bash
nvm use
npm install
npm run dev
```

### Node

To get started, clone this repository and make sure you have the correct [Node.js](https://nodejs.org/) version installed. I highly recommend using [nvm](https://github.com/nvm-sh/nvm) (or [nvm-windows](https://github.com/coreybutler/nvm-windows)) to manage your Node.js versions. The version to use is specified in the [`.nvmrc` file](.nvmrc).

```bash
nvm install
# .nvmrc files are not supported on Windows, so use this instead:
nvm use $(cat .nvmrc)
```

### Install dependencies

Here, [npm](https://www.npmjs.com/) is used.

```bash
npm install
```

### Development server

A dev server is included to serve the extension locally. It will automatically reload the extension when you make changes to the source code.

```bash
npm run dev
```

### Build

To build the extension for production, run:

```bash
npm run build
```

## Installation

Allow the installation of developer extensions in Chrome by navigating to `chrome://extensions/` and toggling the switch in the top right corner.

Click on "Load unpacked" and select the `dist` directory in the project root.

## Usage

1. Open the extension popup by clicking on the icon in the Chrome toolbar.
2. Click the extension icon to cycle through the modes: `Off`, `Send` or `Receive`.
3. In a sending tab, use keyboard and mouse to be mirrored in receiving tabs.
