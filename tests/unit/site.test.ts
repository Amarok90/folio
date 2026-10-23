import { describe, expect, it } from 'vitest';
import { resolveDeployment } from '../../src/config/deployment';
import { site } from '../../src/config/site';
import {
  canonicalURL,
  serializeJsonLd,
  withBasePath,
} from '../../src/lib/urls';

describe('deployment authority', () => {
  it('omits unknown production origin instead of inventing a canonical', () => {
    expect(resolveDeployment({})).toEqual({ site: undefined, base: '/' });
    expect(canonicalURL('/', undefined, '/')).toBeUndefined();
  });
  it('supports root, repository and future custom domains from one origin', () => {
    expect(
      resolveDeployment({
        SITE_URL: 'https://amarok90.github.io',
        BASE_PATH: '/folio',
      }),
    ).toEqual({ site: 'https://amarok90.github.io', base: '/folio/' });
    expect(
      canonicalURL('/', new URL('https://amarok90.github.io'), '/folio/'),
    ).toBe('https://amarok90.github.io/folio/');
    expect(canonicalURL('/404/', new URL('https://portfolio.test'), '/')).toBe(
      'https://portfolio.test/404/',
    );
  });
  it.each([
    'http://folio.test',
    'https://user:pass@folio.test',
    'https://folio.test/path',
    'https://folio.test/?token=x',
    'https://folio.test/#x',
  ])('rejects unsafe or ambiguous origin %s', (value) => {
    expect(() => resolveDeployment({ SITE_URL: value })).toThrow();
  });
  it.each([
    'folio',
    '//external.test',
    '/folio/../',
    '/a/b/',
    '/with space/',
    '/x?y',
  ])('rejects invalid base path %s', (value) => {
    expect(() => resolveDeployment({ BASE_PATH: value })).toThrow();
  });
});

describe('site contracts', () => {
  it('keeps preview non-indexable and navigation unique and anchored', () => {
    expect(site.indexable).toBe(false);
    expect(site.language).toBe('en');
    expect(new Set(site.navigation.map((item) => item.href)).size).toBe(
      site.navigation.length,
    );
    expect(site.navigation.every((item) => /^#[a-z-]+$/.test(item.href))).toBe(
      true,
    );
  });
  it('prefixes assets once and prevents local traversal', () => {
    expect(withBasePath('/fonts/inter.woff2', '/folio/')).toBe(
      '/folio/fonts/inter.woff2',
    );
    for (const path of [
      '//external.test',
      '/../private',
      '/a/./b',
      'javascript:alert(1)',
      '/a\\b',
    ])
      expect(() => withBasePath(path, '/')).toThrow();
  });
  it('serializes structured data without letting content close its script', () => {
    const data = { '@type': 'Person', name: '</script><img src=x>' };
    const serialized = serializeJsonLd(data);
    expect(serialized).not.toContain('<');
    expect(JSON.parse(serialized)).toEqual(data);
  });
});
