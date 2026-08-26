import { defineConfig } from 'wxt';

import { APP_VERSION } from './src/core/version';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'AI Work Memory',
    version: APP_VERSION,
    description: 'Turn everyday AI corrections into reusable working rules.',
    permissions: ['contextMenus', 'sidePanel', 'storage'],
    action: {
      default_title: 'Open AI Work Memory',
    },
  },
});
