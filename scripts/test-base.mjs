import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { verifyBuild } from './verify-build.mjs';

const directory = mkdtempSync(join(tmpdir(), 'folio-base-'));
try {
  const manifest = JSON.parse(
    readFileSync('node_modules/astro/package.json', 'utf8'),
  );
  const binary =
    typeof manifest.bin === 'string' ? manifest.bin : manifest.bin.astro;
  const result = spawnSync(
    process.execPath,
    [resolve('node_modules/astro', binary), 'build', '--outDir', directory],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        ASTRO_TELEMETRY_DISABLED: '1',
        SITE_URL: 'https://folio.test/',
        BASE_PATH: '/folio',
        SITE_INDEXABLE: 'false',
        CLARITY_ENABLED: 'false',
      },
    },
  );
  if (result.status !== 0)
    throw new Error(
      `Project base build failed: ${result.error?.message ?? result.status}`,
    );
  console.log(
    'Project base verified:',
    verifyBuild(directory, '/folio', 'https://folio.test/', false),
  );
  const browserTests = spawnSync(
    process.execPath,
    [
      resolve('node_modules/@playwright/test/cli.js'),
      'test',
      '--config',
      'playwright.base.config.ts',
    ],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        BASE_PATH: '/folio',
        SITE_URL: 'https://folio.test/',
        SITE_INDEXABLE: 'false',
        CLARITY_ENABLED: 'false',
        FOLIO_PREVIEW_OUT_DIR: directory,
      },
    },
  );
  if (browserTests.status !== 0)
    throw new Error(
      `Project base browser tests failed: ${browserTests.error?.message ?? browserTests.status}`,
    );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
