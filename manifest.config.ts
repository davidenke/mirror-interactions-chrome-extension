import { defineManifest } from '@crxjs/vite-plugin';

import { description, displayName, name, version } from './package.json';

// Convert from Semver (example: 0.1.0-beta6)
const [major, minor, patch, label = '0'] = version
  // can only contain digits, dots, or dash
  .replace(/[^\d.-]+/g, '')
  // split into version parts
  .split(/[.-]/);

export default defineManifest(async env => ({
  manifest_version: 3,
  name: env.mode === 'staging' ? `[INTERNAL] ${name}` : displayName,
  description,
  version: `${major}.${minor}.${patch}.${label}`,
  version_name: version,

  icons: {
    16: 'icons/icon-send-16.png',
    32: 'icons/icon-send-32.png',
    48: 'icons/icon-send-48.png',
    128: 'icons/icon-send-128.png',
  },

  action: { default_state: 'enabled' },
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  content_scripts: [
    {
      all_frames: false,
      js: ['src/content.ts'],
      matches: ['*://*/*'],
      run_at: 'document_end',
    },
  ],
  host_permissions: ['*://*/*'],
  permissions: ['activeTab', 'debugger', 'nativeMessaging', 'scripting', 'storage', 'tabs'],
}));
