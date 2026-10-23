import { spawnSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// A dedicated test output keeps configured analytics and synthetic data out of dist.
const manifest = JSON.parse(
  readFileSync('node_modules/astro/package.json', 'utf8'),
);
const binary = resolve(
  'node_modules/astro',
  typeof manifest.bin === 'string' ? manifest.bin : manifest.bin.astro,
);
const prebuilt = process.env.FOLIO_PREVIEW_OUT_DIR;
const directory =
  prebuilt ?? mkdtempSync(join(tmpdir(), 'folio-browser-fixture-'));
const port = process.env.FOLIO_PREVIEW_PORT ?? '4323';
if (!/^\d{4,5}$/.test(port)) throw new Error('A local test port is required.');
if (!prebuilt) {
  const build = spawnSync(
    process.execPath,
    [binary, 'build', '--outDir', directory],
    {
      stdio: 'inherit',
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
    },
  );
  if (build.status !== 0) {
    rmSync(directory, { recursive: true, force: true });
    process.exit(build.status ?? 1);
  }
}
if (!existsSync(join(directory, 'index.html')))
  throw new Error('Verified fixture output was not found.');
const preview = spawn(
  process.execPath,
  [
    binary,
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    port,
    '--outDir',
    directory,
    '--ignore-lock',
  ],
  { stdio: 'inherit' },
);
let stopping = false;
function stop(signal) {
  if (stopping) return;
  stopping = true;
  preview.kill(signal);
}
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
preview.on('exit', (code) => {
  if (!prebuilt) rmSync(directory, { recursive: true, force: true });
  process.exit(code ?? 0);
});
