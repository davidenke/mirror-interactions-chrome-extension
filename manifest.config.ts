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

  // action: { default_popup: 'src/popup/index.html' },
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
  host_permissions: ['<all_urls>'],
  permissions: ['activeTab', 'tabs', 'scripting', 'storage'],
}));
