import { expect, test } from '@playwright/test';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { interfaceSchema } from '../../src/lib/content';

// Valid boundary-length CMS content is tested in its own source/build/cache.
// No owner's content is changed and no fixture enters the production artifact.
test.describe('CMS-managed navigation layout boundaries', () => {
  test.describe.configure({ mode: 'default' });
  let fixture: string;
  let server: Server | undefined;
  let baseURL: string;
  const labels = [
    '#about',
    '#expertise',
    '#projects',
    '#experience',
    '#contact',
  ].map((href, index) => ({
    href,
    label: `Professional capabilities 0${index + 1}`,
  }));

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    fixture = mkdtempSync(join(tmpdir(), 'folio-cms-layout-'));
    const source = resolve('.');
    for (const path of [
      'src',
      'public',
      'scripts',
      '.pages.yml',
      'astro.config.ts',
      'tsconfig.json',
      'package.json',
      'package-lock.json',
    ])
      cpSync(join(source, path), join(fixture, path), { recursive: true });
    symlinkSync(
      join(source, 'node_modules'),
      join(fixture, 'node_modules'),
      'dir',
    );
    const input = JSON.parse(
      readFileSync(join(fixture, 'src/data/interface.json'), 'utf8'),
    );
    input.brand = 'Professional FOLIO Brand';
    input.navigation = labels;
    input.actions.cvViewLabel =
      'Open professional experience and project CV on LinkedIn now...'.slice(
        0,
        60,
      );
    expect(input.brand).toHaveLength(24);
    expect(input.actions.cvViewLabel).toHaveLength(60);
    expect(labels.every((link) => link.label.length === 28)).toBe(true);
    const ui = interfaceSchema.parse(input);
    writeFileSync(join(fixture, 'src/data/interface.json'), JSON.stringify(ui));
    const manifest = JSON.parse(
      readFileSync('node_modules/astro/package.json', 'utf8'),
    );
    const binary = resolve(
      'node_modules/astro',
      typeof manifest.bin === 'string' ? manifest.bin : manifest.bin.astro,
    );
    const build = spawnSync(process.execPath, [binary, 'build'], {
      cwd: fixture,
      env: {
        ...process.env,
        ASTRO_TELEMETRY_DISABLED: '1',
        SITE_URL: 'https://folio.test',
        BASE_PATH: '/folio',
        SITE_INDEXABLE: 'false',
        CLARITY_ENABLED: 'false',
        CLARITY_PROJECT_ID: '',
      },
      encoding: 'utf8',
      timeout: 120_000,
      maxBuffer: 5_000_000,
    });
    expect(build.status, build.stderr || build.stdout).toBe(0);
    const output = join(fixture, 'dist');
    const types: Record<string, string> = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.woff2': 'font/woff2',
      '.webp': 'image/webp',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
    };
    server = createServer((request, response) => {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      const path = resolve(
        output,
        `.${decodeURIComponent(url.pathname.slice('/folio'.length))}`,
      );
      if (
        !url.pathname.startsWith('/folio/') ||
        (!path.startsWith(`${output}${sep}`) && path !== output)
      ) {
        response.writeHead(404);
        response.end();
        return;
      }
      const file =
        existsSync(path) && statSync(path).isDirectory()
          ? join(path, 'index.html')
          : path;
      if (!existsSync(file)) {
        response.writeHead(404);
        response.end();
        return;
      }
      response.writeHead(200, {
        'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      });
      response.end(readFileSync(file));
    });
    await new Promise<void>((complete, reject) => {
      server!.once('error', reject);
      server!.listen(0, '127.0.0.1', complete);
    });
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('CMS layout fixture server did not start.');
    baseURL = `http://127.0.0.1:${address.port}/folio/`;
  });

  test.afterAll(async () => {
    server?.closeAllConnections();
    if (server)
      await new Promise<void>((complete) => server!.close(() => complete()));
    if (fixture) rmSync(fixture, { recursive: true, force: true });
  });

  for (const width of [320, 900, 1024, 1440]) {
    test(`valid maximum-length labels fit and preserve anchor visibility at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(baseURL);
      await page.evaluate(() => document.fonts.ready);
      const nav = page.getByRole('navigation', {
        name: 'Main navigation',
        exact: true,
      });
      if (width < 900) {
        await page
          .getByRole('button', { name: 'Open menu', exact: true })
          .click();
        await expect(nav).toBeVisible();
      }
      for (const { label } of labels) {
        const link = nav.getByRole('link', { name: label, exact: true });
        await expect(link).toBeVisible();
        const bounds = await link.boundingBox();
        expect(bounds?.x).toBeGreaterThanOrEqual(0);
        expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(
          width + 1,
        );
        expect(bounds?.height).toBeGreaterThanOrEqual(44);
        expect(
          await link.evaluate(
            (element) => element.scrollWidth - element.clientWidth,
          ),
        ).toBeLessThanOrEqual(1);
      }
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(1);
      const evidenceDirectory = process.env['FOLIO_SCREENSHOT_DIR'];
      if (evidenceDirectory)
        await page.screenshot({
          path: join(evidenceDirectory, `cms-long-labels-${width}.png`),
          animations: 'disabled',
        });
      await nav
        .getByRole('link', { name: labels[2]!.label, exact: true })
        .focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/#projects$/);
      if (width < 900) await expect(nav).toBeHidden();
      const offset = () =>
        page.evaluate(() => {
          const header = document
            .querySelector('header')!
            .getBoundingClientRect();
          const heading = document
            .querySelector('#projects .eyebrow')!
            .getBoundingClientRect();
          return {
            gap: heading.top - header.bottom,
            headerHeight: header.height,
            headingTop: heading.top,
            headerBottom: header.bottom,
          };
        });
      await expect
        .poll(async () => (await offset()).gap, {
          message: `Anchored section introduction must remain below the sticky header: ${JSON.stringify(await offset())}`,
        })
        .toBeGreaterThanOrEqual(-1);
      if (evidenceDirectory)
        await page.screenshot({
          path: join(evidenceDirectory, `cms-anchor-${width}.png`),
          animations: 'disabled',
        });
    });
  }
});
