import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { resolveDeployment } from '../src/config/deployment.ts';

export function verifyBuild(directory, rawBase = '/', rawOrigin) {
  const { base, site: origin } = resolveDeployment({
    BASE_PATH: rawBase,
    SITE_URL: rawOrigin,
  });
  const output = resolve(directory);
  const walk = (folder) =>
    readdirSync(folder).flatMap((name) => {
      const path = join(folder, name);
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
  const files = walk(output);
  for (const required of [
    'index.html',
    '404.html',
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
    assert.match(html, /name="robots" content="noindex, nofollow"/);
    if (!origin)
      assert.ok(
        !html.includes('rel="canonical"'),
        'Unknown domain must not emit a canonical',
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
  assert.match(index, /Design preview/);
  assert.match(index, /Content verification pending/);
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
  assert.match(index, /View CV/);
  assert.match(
    index,
    /https:\/\/www\.linkedin\.com\/in\/konstantin-arutjunov\/overlay\/1753005451683\/single-media-viewer\//,
  );
  assert.ok(
    !/<a\b[^>]*\bdownload(?:=|[\s>])/.test(index),
    'External CV preview must not expose a fake local download',
  );
  assert.ok(
    !/20\+|International Bank|konstantin@example\.com/.test(index),
    'Unverified reference placeholders leaked into portfolio',
  );
  if (origin)
    assert.ok(
      index.includes(`href="${origin}${base}"`),
      'Configured canonical must include base path',
    );
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
    javascriptBytes < 6000,
    `Portfolio JavaScript budget exceeded: ${javascriptBytes}`,
  );
  // Nine production sections replace the smaller Task 1 component gallery.
  // Both source size and compressed payload are bounded to prevent silent growth.
  assert.ok(cssBytes < 64000, `Portfolio CSS budget exceeded: ${cssBytes}`);
  assert.ok(
    cssGzipBytes < 14000,
    `Compressed portfolio CSS budget exceeded: ${cssGzipBytes}`,
  );
  assert.ok(fontBytes < 70000, `Font budget exceeded: ${fontBytes}`);
  assert.equal(
    readFileSync(join(output, 'robots.txt'), 'utf8'),
    'User-agent: *\nDisallow: /\n',
  );
  return {
    htmlPages: htmlFiles.length,
    javascriptBytes,
    cssBytes,
    cssGzipBytes,
    fontBytes,
    base,
    canonicalConfigured: Boolean(origin),
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
