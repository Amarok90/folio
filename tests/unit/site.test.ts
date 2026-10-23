import { describe, expect, it } from 'vitest';
import { createE2EConfig } from '../../playwright.config';
import {
  resolveDeployment,
  resolveIndexability,
} from '../../src/config/deployment';
import { site } from '../../src/config/site';
import { interfaceContent } from '../../src/data/interface';
import { interfaceSchema } from '../../src/lib/content';
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

describe('browser verification target', () => {
  it.each([
    '',
    '/folio/',
    'http://example.com/folio/',
    '//example.com/folio/',
    'https://example.com/folio',
    'https://user:secret@example.com/folio/',
    'https://example.com/folio/?query=/',
    'https://example.com/folio/#fragment/',
    'https://example.com/folio/ ',
    'https://example.com\\folio/',
  ])(
    'rejects unsafe or ambiguous live URL %j before starting a server',
    (value) => {
      expect(() => createE2EConfig({ FOLIO_E2E_URL: value })).toThrow(
        'FOLIO_E2E_URL',
      );
    },
  );

  it('uses the explicit live URL without spawning a preview or including CMS fixtures', () => {
    const config = createE2EConfig({
      FOLIO_E2E_URL: 'https://amarok90.github.io/folio/',
      SITE_URL: 'https://amarok90.github.io',
      SITE_INDEXABLE: 'true',
    });
    expect(config.use?.baseURL).toBe('https://amarok90.github.io/folio/');
    expect(Object.hasOwn(config, 'webServer')).toBe(false);
    expect(config.testMatch).toBe('**/portfolio.spec.ts');
  });

  it('preserves the local server and complete suite when no live URL is supplied', () => {
    const config = createE2EConfig({ BASE_PATH: '/folio', CI: 'true' });
    expect(config.use?.baseURL).toBe('http://127.0.0.1:4321/folio/');
    expect(config.webServer).toMatchObject({
      command: 'npm run preview -- --host 127.0.0.1 --port 4321 --ignore-lock',
      url: 'http://127.0.0.1:4321/folio/',
      reuseExistingServer: false,
    });
    expect(Object.hasOwn(config, 'testMatch')).toBe(false);
    expect(createE2EConfig({}).use?.baseURL).toBe('http://127.0.0.1:4321/');
  });
});

describe('site contracts', () => {
  it('requires a separate explicit launch switch and known origin before indexing', () => {
    expect(resolveIndexability({})).toBe(false);
    expect(
      resolveIndexability({ SITE_URL: 'https://amarok90.github.io' }),
    ).toBe(false);
    expect(resolveIndexability({ SITE_INDEXABLE: 'false' })).toBe(false);
    expect(
      resolveIndexability({
        SITE_INDEXABLE: 'true',
        SITE_URL: 'https://amarok90.github.io',
      }),
    ).toBe(true);
    expect(() => resolveIndexability({ SITE_INDEXABLE: 'true' })).toThrow(
      /SITE_URL/,
    );
    expect(() => resolveIndexability({ SITE_INDEXABLE: 'yes' })).toThrow();
  });
  it('keeps preview non-indexable and navigation unique and anchored', () => {
    expect(site.indexable).toBe(resolveIndexability(process.env));
    expect(site.language).toBe('en');
    expect(new Set(site.navigation.map((item) => item.href)).size).toBe(
      site.navigation.length,
    );
    expect(site.navigation.every((item) => /^#[a-z-]+$/.test(item.href))).toBe(
      true,
    );
    expect(site.navigation).toEqual(interfaceContent.navigation);
    expect(site.brand).toBe(interfaceContent.brand);
    expect(site.title).toContain(site.identity.name);
    expect(site.description).not.toMatch(/foundation preview/i);
  });
  it('lets CMS edit website wording while preserving safe destinations and truthful CV actions', () => {
    const edited = {
      ...interfaceContent,
      navigation: [{ label: 'My work', href: '#projects' }],
      actions: {
        ...interfaceContent.actions,
        cvViewLabel: 'Open CV on LinkedIn',
      },
    };
    expect(interfaceSchema.safeParse(edited).success).toBe(true);
    expect(
      interfaceSchema.safeParse({
        ...edited,
        navigation: [{ label: 'Unsafe', href: 'javascript:alert(1)' }],
      }).success,
    ).toBe(false);
    expect(
      interfaceSchema.safeParse({
        ...edited,
        navigation: [edited.navigation[0], edited.navigation[0]],
      }).success,
    ).toBe(false);
    expect(
      interfaceSchema.safeParse({
        ...edited,
        actions: { ...edited.actions, cvViewLabel: 'Download CV' },
      }).success,
    ).toBe(false);
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
