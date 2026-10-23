import { defineConfig } from '@playwright/test';
import common from './playwright.config';

export default defineConfig({
  ...common,
  testDir: './tests/analytics',
  use: { ...common.use, baseURL: 'http://127.0.0.1:4323/folio/' },
  webServer: {
    command: 'node scripts/preview-fixture.mjs',
    url: 'http://127.0.0.1:4323/folio/',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ASTRO_TELEMETRY_DISABLED: '1',
      SITE_URL: 'https://folio.test',
      BASE_PATH: '/folio',
      SITE_INDEXABLE: 'false',
      CLARITY_ENABLED: 'true',
      CLARITY_PROJECT_ID: 'folio1234',
      FOLIO_PREVIEW_PORT: '4323',
    },
  },
});
