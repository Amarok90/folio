import { defineConfig } from '@playwright/test';
import common from './playwright.config';

export default defineConfig({
  ...common,
  use: { ...common.use, baseURL: 'http://127.0.0.1:4324/folio/' },
  webServer: {
    command: 'node scripts/preview-fixture.mjs',
    url: 'http://127.0.0.1:4324/folio/',
    reuseExistingServer: false,
    timeout: 30_000,
    env: { BASE_PATH: '/folio', FOLIO_PREVIEW_PORT: '4324' },
  },
});
