import assert from 'node:assert/strict';
import { execFile, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { gzipSync } from 'node:zlib';
import { chromium } from '@playwright/test';
import { verifyBuild } from './verify-build.mjs';

const execute = promisify(execFile);
const root = process.cwd();
const temporary = await mkdtemp(join(tmpdir(), 'folio-lighthouse-'));
const output = join(temporary, 'dist');
const reports = resolve(
  process.env.FOLIO_LIGHTHOUSE_DIR ?? 'test-results/lighthouse',
);
const base = '/folio/';
const origin = 'https://amarok90.github.io';
const env = {
  ...process.env,
  ASTRO_TELEMETRY_DISABLED: '1',
  SITE_URL: origin,
  BASE_PATH: base,
  SITE_INDEXABLE: 'true',
  CLARITY_ENABLED: 'false',
  CLARITY_PROJECT_ID: '',
};
let server;
try {
  const validation = spawnSync(
    process.execPath,
    ['scripts/validate-content.mjs'],
    { stdio: 'inherit', env },
  );
  assert.equal(validation.status, 0, 'Content must validate before Lighthouse');
  const build = spawnSync(
    process.execPath,
    ['node_modules/astro/bin/astro.mjs', 'build', '--outDir', output],
    { stdio: 'inherit', env },
  );
  assert.equal(build.status, 0, 'Indexable production-candidate build failed');
  console.log('Lighthouse candidate:', verifyBuild(output, base, origin, true));
  await mkdir(reports, { recursive: true });
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.xml': 'application/xml',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.woff2': 'font/woff2',
    '.pdf': 'application/pdf',
  };
  server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(
        new URL(request.url, 'http://localhost').pathname,
      );
      if (!pathname.startsWith(base)) {
        response.writeHead(404).end();
        return;
      }
      let file = resolve(output, pathname.slice(base.length) || 'index.html');
      if (!file.startsWith(output + sep)) {
        response.writeHead(404).end();
        return;
      }
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const bytes = await readFile(file);
      const compressed =
        /\bgzip\b/.test(request.headers['accept-encoding'] ?? '') &&
        /\.(html|css|js|json|txt|xml|svg)$/.test(file);
      response.writeHead(200, {
        'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
        'Cache-Control':
          extname(file) === '.html' ? 'no-cache' : 'public, max-age=600',
        Vary: 'Accept-Encoding',
        ...(compressed ? { 'Content-Encoding': 'gzip' } : {}),
      });
      response.end(compressed ? gzipSync(bytes) : bytes);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const url = `http://127.0.0.1:${server.address().port}${base}`;
  const scores = {};
  for (const device of ['mobile', 'desktop']) {
    const prefix = join(reports, device);
    const args = [
      'node_modules/lighthouse/cli/index.js',
      url,
      '--quiet',
      '--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage',
      '--only-categories=performance,accessibility,best-practices,seo',
      '--output=json',
      '--output=html',
      `--output-path=${prefix}`,
    ];
    if (device === 'desktop') args.push('--preset=desktop');
    await execute(process.execPath, args, {
      cwd: root,
      env: {
        ...env,
        CHROME_PATH:
          process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
          chromium.executablePath(),
      },
      timeout: 120_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    const report = JSON.parse(await readFile(`${prefix}.report.json`, 'utf8'));
    assert.ok(!report.runtimeError, report.runtimeError?.message);
    scores[device] = Object.fromEntries(
      Object.entries(report.categories).map(([key, value]) => [
        key,
        Math.round(value.score * 100),
      ]),
    );
    console.log(`Lighthouse ${device}:`, scores[device]);
    for (const [category, score] of Object.entries(scores[device])) {
      assert.ok(
        score >= 95,
        `${device} ${category}: ${score} < 95; see ${prefix}.report.html`,
      );
    }
  }
  console.log(
    `Lighthouse reports: ${reports}. Local indexable candidate, gzip text delivery and 10-minute static cache; verify real host encoding/cache in Task 4. No public deployment or live Clarity.`,
  );
} finally {
  if (server) await new Promise((done) => server.close(done));
  await rm(temporary, { recursive: true, force: true });
}
