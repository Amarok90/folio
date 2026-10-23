import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import {
  resolveDeployment,
  resolveIndexability,
} from '../src/config/deployment.ts';
import { interfaceSchema } from '../src/lib/content.ts';

const escapeText = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export function verifyBuild(
  directory,
  rawBase = '/',
  rawOrigin,
  indexable = resolveIndexability(process.env),
) {
  const { base, site: origin } = resolveDeployment({
    BASE_PATH: rawBase,
    SITE_URL: rawOrigin,
  });
  const output = resolve(directory);
  const profile = JSON.parse(
    readFileSync(new URL('../src/data/profile.json', import.meta.url), 'utf8'),
  );
  const ui = interfaceSchema.parse(
    JSON.parse(
      readFileSync(
        new URL('../src/data/interface.json', import.meta.url),
        'utf8',
      ),
    ),
  );
  const walk = (folder) =>
    readdirSync(folder).flatMap((name) => {
      const path = join(folder, name);
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
  const files = walk(output);
  for (const required of [
    'index.html',
    '404.html',
    'privacy/index.html',
    'robots.txt',
    '.nojekyll',
    'icons/favicon.svg',
    'fonts/inter-OFL.txt',
    'fonts/caveat-OFL.txt',
  ]) {
    assert.ok(
      existsSync(join(output, required)),
      `Missing static artifact: ${required}`,
    );
  }
  assert.ok(
    !files.some(
      (path) => /\.(?:astro|tsx?|env)$/.test(path) || /\/server\//.test(path),
    ),
    'Source/server files leaked into output',
  );
  const htmlFiles = files.filter((path) => extname(path) === '.html');
  for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf8');
    assert.ok(
      !html.includes('<astro-island'),
      'Unexpected client framework hydration',
    );
    assert.match(html, /<html lang="en"/);
    const is404 = file === join(output, '404.html');
    assert.match(
      html,
      indexable && !is404
        ? /name="robots" content="index, follow"/
        : /name="robots" content="noindex, nofollow"/,
    );
    if (!origin)
      assert.ok(
        !html.includes('rel="canonical"'),
        'Unknown domain must not emit a canonical',
      );
    if (is404)
      assert.ok(
        !html.includes('rel="canonical"'),
        '404 must not advertise a canonical page.',
      );
    assert.match(
      html,
      /data-clarity-mask="true"/,
      'Session replay masking must cover the document.',
    );
    assert.ok(
      !/<script[^>]+src="https?:\/\//.test(html),
      'Optional third-party scripts must not be embedded before consent.',
    );
    const verifyLocalURL = (href) => {
      if (/^(?:https:|mailto:|tel:|data:)/.test(href)) return;
      if (href.startsWith('#')) {
        assert.ok(
          html.includes(`id="${href.slice(1)}"`),
          `Broken same-page anchor in ${file}: ${href}`,
        );
        return;
      }
      assert.ok(
        href.startsWith(base),
        `Asset/link bypasses base ${base}: ${href}`,
      );
      const local = href.slice(base.length).split(/[?#]/)[0];
      const target = join(output, local || 'index.html');
      const resolvedTarget =
        existsSync(target) && statSync(target).isFile()
          ? target
          : join(target, 'index.html');
      assert.ok(existsSync(resolvedTarget), `Broken local URL: ${href}`);
      const fragment = href.split('#')[1];
      if (fragment && extname(resolvedTarget) === '.html') {
        assert.ok(
          readFileSync(resolvedTarget, 'utf8').includes(`id="${fragment}"`),
          `Broken destination anchor: ${href}`,
        );
      }
    };
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      verifyLocalURL(match[1]);
    }
    for (const match of html.matchAll(/srcset="([^"]+)"/g)) {
      for (const candidate of match[1].split(',')) {
        verifyLocalURL(candidate.trim().split(/\s+/)[0]);
      }
    }
  }
  const index = readFileSync(join(output, 'index.html'), 'utf8');
  assert.ok(
    !/Foundation preview/i.test(index),
    'Task 1 scaffolding leaked into portfolio',
  );
  for (const id of [
    'main-content',
    'home',
    'highlights',
    'expertise',
    'projects',
    'experience',
    'about',
    'contact',
  ]) {
    assert.equal(
      [...index.matchAll(new RegExp(`\\bid="${id}"`, 'g'))].length,
      1,
      `Missing or duplicate portfolio section: ${id}`,
    );
  }
  assert.match(index, /Skip to content/);
  if (profile.cv) {
    assert.ok(index.includes(escapeText(ui.actions.cvDownloadLabel)));
    assert.ok(index.includes(`href="${base}${profile.cv.path.slice(1)}"`));
    assert.ok(index.includes(`download="${profile.cv.filename}"`));
  } else if (profile.cvPreviewUrl) {
    assert.ok(index.includes(escapeText(ui.actions.cvViewLabel)));
    assert.ok(index.includes(profile.cvPreviewUrl.replaceAll('&', '&amp;')));
    assert.ok(
      !/<a\b[^>]*\bdownload(?:=|[\s>])/.test(index),
      'External CV preview must not expose a fake local download',
    );
  } else assert.ok(index.includes(escapeText(ui.actions.cvPendingLabel)));
  assert.ok(
    !/International Bank|konstantin@example\.com/.test(index),
    'Unverified reference placeholders leaked into portfolio',
  );
  if (origin)
    assert.ok(
      index.includes(`href="${origin}${base}"`),
      'Configured canonical must include base path',
    );
  const personMatch = index.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  assert.ok(personMatch, 'Missing Person structured data.');
  const person = JSON.parse(personMatch[1]);
  assert.equal(person['@type'], 'Person');
  assert.equal(person.name, profile.identity.name);
  assert.equal(person.jobTitle, profile.identity.jobTitle);
  assert.deepEqual(
    person.sameAs,
    profile.contact.links.map((link) => link.url),
  );
  assert.ok(
    !/CMS integration|CMS rollback|cms-workflow|Download integration fixture/.test(
      index,
    ),
    'Test content leaked into production output.',
  );
  const privacy = readFileSync(join(output, 'privacy/index.html'), 'utf8');
  assert.match(privacy, /Privacy policy/);
  assert.match(privacy, /folio\.consent\.v1/);
  assert.match(privacy, /180 days/);
  if (profile.contact.email)
    assert.ok(privacy.includes(`mailto:${profile.contact.email}`));
  if (origin) {
    assert.ok(
      privacy.includes(`href="${origin}${base}privacy/"`),
      'Privacy canonical bypasses the deployment base.',
    );
    assert.ok(
      existsSync(join(output, 'sitemap-index.xml')),
      'Missing configured sitemap.',
    );
    const sitemap = files
      .filter((path) => /sitemap.*\.xml$/.test(path))
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n');
    assert.ok(
      sitemap.includes(`${origin}${base}privacy/`),
      'Privacy page missing from sitemap.',
    );
    assert.ok(!sitemap.includes('/404'), '404 must be excluded from sitemap.');
  }
  const sizeOf = (extension) =>
    files
      .filter((path) => path.endsWith(extension))
      .reduce((sum, path) => sum + statSync(path).size, 0);
  const inlineJavascriptBytes = htmlFiles.reduce((total, file) => {
    const html = readFileSync(file, 'utf8');
    return (
      total +
      [
        ...html.matchAll(/<script\s+type="module">([\s\S]*?)<\/script>/g),
      ].reduce((sum, match) => sum + Buffer.byteLength(match[1]), 0)
    );
  }, 0);
  const javascriptBytes = sizeOf('.js') + inlineJavascriptBytes;
  const cssBytes = sizeOf('.css');
  const cssGzipBytes = files
    .filter((path) => path.endsWith('.css'))
    .reduce((sum, path) => sum + gzipSync(readFileSync(path)).length, 0);
  const fontBytes = sizeOf('.woff2');
  assert.ok(
    javascriptBytes < 12000,
    `Portfolio JavaScript budget exceeded: ${javascriptBytes}`,
  );
  // Task 3 adds a third static page and an accessible, resilient consent controller.
  // Measured aggregate: ~10.4 kB JS / 64.2 kB CSS / 11.9 kB gzip CSS.
  // These include shared scripts repeated inline across the three HTML pages.
  assert.ok(cssBytes < 68000, `Portfolio CSS budget exceeded: ${cssBytes}`);
  assert.ok(
    cssGzipBytes < 14000,
    `Compressed portfolio CSS budget exceeded: ${cssGzipBytes}`,
  );
  assert.ok(fontBytes < 70000, `Font budget exceeded: ${fontBytes}`);
  assert.equal(
    readFileSync(join(output, 'robots.txt'), 'utf8'),
    indexable && origin
      ? `User-agent: *\nAllow: /\nSitemap: ${origin}${base}sitemap-index.xml\n`
      : 'User-agent: *\nDisallow: /\n',
  );
  return {
    htmlPages: htmlFiles.length,
    javascriptBytes,
    cssBytes,
    cssGzipBytes,
    fontBytes,
    base,
    canonicalConfigured: Boolean(origin),
    indexable,
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  console.log(
    'Static build verified:',
    verifyBuild(
      process.argv[2] ?? 'dist',
      process.env.BASE_PATH ?? '/',
      process.env.SITE_URL,
    ),
  );
}
