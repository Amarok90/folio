import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
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
    for (const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
      const href = match[1];
      if (/^(?:https:|mailto:|tel:|data:)/.test(href)) continue;
      assert.ok(
        href.startsWith(base),
        `Asset/link bypasses base ${base}: ${href}`,
      );
      const local = href.slice(base.length).split(/[?#]/)[0];
      const target = join(output, local || 'index.html');
      assert.ok(
        existsSync(target) || existsSync(join(target, 'index.html')),
        `Broken local URL: ${href}`,
      );
    }
  }
  const index = readFileSync(join(output, 'index.html'), 'utf8');
  assert.match(index, /Foundation preview/);
  assert.match(index, /<button[^>]*disabled[^>]*>/);
  assert.match(index, /Skip to content/);
  assert.ok(
    !/10\+|20\+|International Bank/.test(index),
    'Unverified reference career claims leaked into preview',
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
  const fontBytes = sizeOf('.woff2');
  assert.ok(
    javascriptBytes < 6000,
    `Foundation JavaScript budget exceeded: ${javascriptBytes}`,
  );
  assert.ok(cssBytes < 40000, `Foundation CSS budget exceeded: ${cssBytes}`);
  assert.ok(fontBytes < 70000, `Font budget exceeded: ${fontBytes}`);
  assert.equal(
    readFileSync(join(output, 'robots.txt'), 'utf8'),
    'User-agent: *\nDisallow: /\n',
  );
  return {
    htmlPages: htmlFiles.length,
    javascriptBytes,
    cssBytes,
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
