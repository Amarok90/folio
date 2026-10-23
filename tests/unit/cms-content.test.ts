import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import interfaceSource from '../../src/data/interface.json';
import { usesSignatureFont } from '../../src/data/interface';
import { validateCMSConfiguration } from '../../scripts/validate-content.mjs';
import { profile } from '../../src/data/profile';
import mediaSource from '../../src/data/media.json';
import {
  caseStudySchema,
  imageAssetPathSchema,
  imageSchema,
  mediaSchema,
  interfaceSchema,
  profileSchema,
} from '../../src/lib/content';

describe('CMS-compatible media contracts', () => {
  it('validates the canonical media source and preserves explicit temporary status', () => {
    const media = mediaSchema.parse(mediaSource);
    expect(typeof media.portrait.temporary).toBe('boolean');
    expect(media.portrait.alt).toMatch(/\S/);
    expect(
      media.projects.every((image) => typeof image.illustrative === 'boolean'),
    ).toBe(true);
  });
  it.each([
    '/src/assets/photo.png',
    '/src/assets/owner/portrait.JpEg',
    '/src/assets/example.avif',
  ])('accepts local optimized-image sources %s', (path) => {
    expect(imageAssetPathSchema.safeParse(path).success).toBe(true);
  });
  it.each([
    '/src/assets/../secret.png',
    '/src/assets/x.svg',
    '/images/photo.png',
    'https://example.com/photo.png',
    '/src/assets/photo.png?token=private',
    '/src/assets/x\\y.png',
  ])('rejects unsafe or unprocessed media %s', (path) => {
    expect(imageAssetPathSchema.safeParse(path).success).toBe(false);
  });
  it('requires meaningful image alternatives and explicit portrait provenance', () => {
    expect(
      imageAssetPathSchema.safeParse('/SRC/ASSETS/photo.png').success,
    ).toBe(false);
    expect(
      imageSchema.safeParse({ path: '/src/assets/photo.png', alt: '' }).success,
    ).toBe(false);
    const portrait = { ...mediaSource.portrait, temporary: undefined };
    expect(mediaSchema.safeParse({ ...mediaSource, portrait }).success).toBe(
      false,
    );
  });
});

describe('nontechnical owner edits retain safe publication semantics', () => {
  it('allows clearing a project image while the CMS retains its boolean illustration setting', () => {
    const project = {
      id: 'cleared-image-fixture',
      order: 0,
      status: 'draft',
      visible: false,
      title: 'Example',
      summary: 'Example',
      sector: null,
      challenge: 'Example',
      contribution: 'Example',
      outcomes: [],
      limitations: [],
      skillIds: [],
      link: null,
    };
    for (const illustrative of [true, false])
      expect(
        caseStudySchema.parse({
          ...project,
          image: { path: '', alt: '', illustrative },
        }).image,
      ).toBeNull();
    expect(
      caseStudySchema.safeParse({
        ...project,
        image: { path: '', alt: 'A description', illustrative: true },
      }).success,
    ).toBe(false);
  });
  it('treats clearing optional CMS inputs as missing information', () => {
    const parsed = profileSchema.parse({
      ...profile,
      cv: { path: '', filename: '', updatedAt: '', language: '' },
      cvPreviewUrl: '',
      contact: { ...profile.contact, email: '' },
      seo: { ...profile.seo, socialImage: { path: '', alt: '' } },
    });
    expect(parsed.cv).toBeNull();
    expect(parsed.cvPreviewUrl).toBeNull();
    expect(parsed.contact.email).toBeNull();
    expect(parsed.seo.socialImage).toBeNull();
  });
  it('does not accept incomplete CV metadata as a downloadable document', () => {
    expect(
      profileSchema.safeParse({
        ...profile,
        cv: { path: '/documents/example.pdf' },
      }).success,
    ).toBe(false);
  });
  it('keeps professional contact channels restricted to email and the LinkedIn profile', () => {
    for (const url of [
      'https://example.com/profile',
      'https://linkedin.com/company/example',
      'https://linkedin.com/in/example/?email=private',
      'https://linkedin.com.evil.test/in/example',
    ]) {
      expect(
        profileSchema.safeParse({
          ...profile,
          contact: { ...profile.contact, links: [{ label: 'LinkedIn', url }] },
        }).success,
      ).toBe(false);
    }
    expect(
      profileSchema.safeParse({
        ...profile,
        contact: { ...profile.contact, phone: '+0000000' },
      }).success,
    ).toBe(false);
  });
  it('requires a usable introduction and working philosophy when edited', () => {
    expect(
      profileSchema.safeParse({
        ...profile,
        hero: { ...profile.hero, approach: [] },
      }).success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({
        ...profile,
        about: {
          ...profile.about,
          approach: [{ title: '', description: 'Example' }],
        },
      }).success,
    ).toBe(false);
  });
});

describe('owner-managed website wording and actions', () => {
  it('validates the canonical website copy independently of professional facts', () => {
    const copy = interfaceSchema.parse(interfaceSource);
    expect(copy.navigation.length).toBeGreaterThan(0);
    expect(new Set(copy.navigation.map((link) => link.href)).size).toBe(
      copy.navigation.length,
    );
    for (const section of [
      'expertise',
      'projects',
      'journey',
      'about',
      'contact',
    ] as const) {
      expect(copy[section].titleLines.length).toBeGreaterThan(0);
      expect(copy[section].eyebrow).toMatch(/\S/);
    }
    expect(copy.hero.primaryAction.href).toMatch(/^#/);
    expect(copy.footer.backToTopLabel).toMatch(/\S/);
  });

  it('allows useful wording, section-target and contact-channel changes without arbitrary destinations', () => {
    const changed = interfaceSchema.parse({
      ...interfaceSource,
      hero: {
        ...interfaceSource.hero,
        primaryAction: { label: 'See my experience', href: '#experience' },
      },
      contact: {
        ...interfaceSource.contact,
        preferredChannel: 'linkedin',
        primaryActionLabel: 'Discuss an opportunity',
      },
      projects: { ...interfaceSource.projects, titleLines: ['Selected work'] },
    });
    expect(changed.hero.primaryAction.href).toBe('#experience');
    expect(changed.contact.preferredChannel).toBe('linkedin');
    expect(changed.projects.titleLines).toEqual(['Selected work']);
    for (const href of [
      'javascript:alert(1)',
      'https://example.com',
      '#missing',
      '/another-page/',
    ]) {
      expect(
        interfaceSchema.safeParse({
          ...interfaceSource,
          hero: {
            ...interfaceSource.hero,
            primaryAction: { label: 'Example', href },
          },
        }).success,
      ).toBe(false);
    }
  });

  it('rejects ambiguous navigation, empty headings and misleading CV-view labels', () => {
    expect(
      interfaceSchema.safeParse({ ...interfaceSource, navigation: [] }).success,
    ).toBe(false);
    expect(
      interfaceSchema.safeParse({
        ...interfaceSource,
        navigation: [
          interfaceSource.navigation[0],
          interfaceSource.navigation[0],
        ],
      }).success,
    ).toBe(false);
    expect(
      interfaceSchema.safeParse({
        ...interfaceSource,
        projects: { ...interfaceSource.projects, titleLines: [] },
      }).success,
    ).toBe(false);
    expect(
      interfaceSchema.safeParse({
        ...interfaceSource,
        contact: { ...interfaceSource.contact, preferredChannel: 'phone' },
      }).success,
    ).toBe(false);
    expect(
      interfaceSchema.safeParse({
        ...interfaceSource,
        actions: { ...interfaceSource.actions, cvViewLabel: 'Download PDF CV' },
      }).success,
    ).toBe(false);
    expect(
      interfaceSchema.safeParse({
        ...interfaceSource,
        actions: { ...interfaceSource.actions, cvViewLabel: 'Read CV' },
      }).success,
    ).toBe(true);
  });

  it('keeps every owner field editable through the matching Pages CMS schema', () => {
    const config = validateCMSConfiguration(
      readFileSync(new URL('../../.pages.yml', import.meta.url), 'utf8'),
    );
    expect(
      config.content.some(
        (entry: { path: string }) => entry.path === 'src/data/interface.json',
      ),
    ).toBe(true);
    const editor = config.content.find(
      (entry: { name: string }) => entry.name === 'interface',
    );
    editor.fields = editor.fields.filter(
      (field: { name: string }) => field.name !== 'contact',
    );
    expect(() => validateCMSConfiguration(JSON.stringify(config))).toThrow(
      /field coverage/i,
    );
  });
});

describe('editable decorative signature typography', () => {
  it('uses the handwriting subset only for its exact approved text', () => {
    expect(
      usesSignatureFont(['Ideas', 'Analysis', 'Solutions', 'Impact']),
    ).toBe(true);
    expect(
      usesSignatureFont(['Curiosity', 'Analysis', 'Solutions', 'Impact']),
    ).toBe(false);
    expect(
      usesSignatureFont(['IDEAS', 'Analysis', 'Solutions', 'Impact']),
    ).toBe(false);
    expect(usesSignatureFont([])).toBe(false);
  });
});
