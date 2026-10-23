import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
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
  let ratingCategoryId: string;
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
    const profile = JSON.parse(
      readFileSync(join(fixture, 'src/data/profile.json'), 'utf8'),
    );
    const cvLabel = profile.cv
      ? 'cvDownloadLabel'
      : profile.cvPreviewUrl
        ? 'cvViewLabel'
        : 'cvPendingLabel';
    input.actions[cvLabel] = (
      profile.cv
        ? 'Download professional experience and project CV document now...'
        : profile.cvPreviewUrl
          ? 'Open professional experience and project CV on LinkedIn now...'
          : 'CV currently unavailable; contact Konstantin for further information.'
    ).slice(0, 60);
    expect(input.brand).toHaveLength(24);
    expect(input.actions[cvLabel]).toHaveLength(60);
    expect(labels.every((link) => link.label.length === 28)).toBe(true);
    const ui = interfaceSchema.parse(input);
    writeFileSync(join(fixture, 'src/data/interface.json'), JSON.stringify(ui));
    const categories = JSON.parse(
      readFileSync(join(fixture, 'src/content/expertise.json'), 'utf8'),
    );
    ratingCategoryId = 'cms-assessment-category';
    categories.push({
      id: ratingCategoryId,
      order: 0,
      status: 'published',
      visible: true,
      title: 'Assessment fixture',
      description: 'Isolated owner assessment accessibility fixture.',
    });
    writeFileSync(
      join(fixture, 'src/content/expertise.json'),
      JSON.stringify(categories),
    );
    const skills = JSON.parse(
      readFileSync(join(fixture, 'src/content/skills.json'), 'utf8'),
    );
    skills.push(
      ...[
        {
          id: 'minimum',
          name: 'Minimum assessment fixture',
          selfAssessment: 1,
          proficiency: null,
        },
        {
          id: 'maximum',
          name: 'Maximum assessment fixture',
          selfAssessment: 100,
          proficiency: 'expert',
        },
        {
          id: 'unknown',
          name: 'Unknown assessment fixture',
          selfAssessment: null,
          proficiency: 'advanced',
        },
      ].map((entry, order) => ({
        ...entry,
        id: `cms-assessment-${entry.id}`,
        order,
        status: 'published',
        visible: true,
        categoryId: ratingCategoryId,
      })),
    );
    writeFileSync(
      join(fixture, 'src/content/skills.json'),
      JSON.stringify(skills),
    );
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

  for (const width of [390, 1440]) {
    test(`owner-provided skill values have accessible boundaries and no invented unknown rating at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(baseURL);
      await page.evaluate(() => document.fonts.ready);
      await page.locator(`#expertise-tab-${ratingCategoryId}`).click();
      const panel = page.locator(`#expertise-panel-${ratingCategoryId}`);
      await expect(panel).toBeVisible();
      await expect(panel.getByRole('meter')).toHaveCount(2);
      for (const [name, value] of [
        ['Minimum assessment fixture', 1],
        ['Maximum assessment fixture', 100],
      ] as const) {
        const bar = panel.getByRole('meter', { name: new RegExp(name) });
        await expect(bar).toHaveAttribute('value', String(value));
        await expect(bar).toHaveAttribute('min', '1');
        await expect(bar).toHaveAttribute('max', '100');
        await expect(bar).toHaveAccessibleName(new RegExp(name));
        await expect(bar).toBeVisible();
        const score = bar.locator('..').locator('.skill-score-value');
        await expect(score).toHaveText(String(value));
        const scoreWidth = await score.evaluate((element) => {
          const text = document.createRange();
          text.selectNodeContents(element);
          return {
            label: text.getBoundingClientRect().width,
            available: element.getBoundingClientRect().width,
          };
        });
        expect(scoreWidth.label).toBeLessThanOrEqual(scoreWidth.available + 1);
      }
      const unknown = panel
        .locator('.skill-row')
        .filter({ hasText: 'Unknown assessment fixture' });
      await expect(unknown).toContainText('advanced');
      await expect(unknown.getByRole('meter')).toHaveCount(0);
      await expect(page.locator('#expertise')).toContainText(/self-assessed/i);
      const accessibility = await new AxeBuilder({ page })
        .include('#expertise')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(accessibility.violations).toEqual([]);
    });
  }
});
