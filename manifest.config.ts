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

  action: { default_state: 'enabled' },
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  host_permissions: ['*://*/*'],
  permissions: ['activeTab', 'debugger', 'nativeMessaging', 'scripting', 'storage', 'tabs'],
}));
