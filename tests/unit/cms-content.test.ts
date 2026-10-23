import { describe, expect, it } from 'vitest';
import { profile } from '../../src/data/profile';
import mediaSource from '../../src/data/media.json';
import {
  caseStudySchema,
  imageAssetPathSchema,
  imageSchema,
  mediaSchema,
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
