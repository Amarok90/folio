import { describe, expect, it } from 'vitest';
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import interfaceSource from '../../src/data/interface.json';
import { usesSignatureFont } from '../../src/data/interface';
import {
  validateCMSConfiguration,
  validateRepositoryContent,
} from '../../scripts/validate-content.mjs';
import { profile } from '../../src/data/profile';
import mediaSource from '../../src/data/media.json';
import {
  caseStudySchema,
  imageAssetPathSchema,
  imageSchema,
  mediaSchema,
  interfaceSchema,
  profileSchema,
  skillSchema,
} from '../../src/lib/content';

interface CMSField {
  name: string;
  component?: string;
  hidden?: boolean;
  type?: string;
  required?: boolean;
  fields?: CMSField[];
  options?: Record<string, unknown>;
}
interface CMSEntry {
  name: string;
  type: string;
  path?: string;
  items?: CMSEntry[];
  fields?: CMSField[];
  list?: boolean;
  operations?: { create?: boolean; rename?: boolean; delete?: boolean };
}
interface CMSConfiguration {
  content: CMSEntry[];
  components: Record<string, CMSField>;
  media: {
    name: string;
    input: string;
    output: string;
    extensions: string[];
  }[];
  settings: { content: { merge: boolean } };
}
const loadCMSConfiguration = (): CMSConfiguration =>
  validateCMSConfiguration(
    readFileSync(new URL('../../.pages.yml', import.meta.url), 'utf8'),
  );
const flattenCMSEditors = (entries: CMSEntry[]): CMSEntry[] =>
  entries.flatMap((entry) =>
    entry.type === 'group' ? flattenCMSEditors(entry.items ?? []) : [entry],
  );
function cmsEditor(
  config: CMSConfiguration,
  name: string,
): CMSEntry & { fields: CMSField[] } {
  const editor = flattenCMSEditors(config.content).find(
    (entry) => entry.name === name,
  );
  if (!editor?.fields) throw new Error(`Missing CMS editor: ${name}`);
  return editor as CMSEntry & { fields: CMSField[] };
}
function cmsField(
  config: CMSConfiguration,
  fields: CMSField[],
  name: string,
): CMSField {
  const field = fields.find((entry) => entry.name === name);
  if (!field) throw new Error(`Missing CMS field: ${name}`);
  return field.component
    ? { ...config.components[field.component], ...field }
    : field;
}

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
  it('allows an optional analytics illustration without weakening image validation', () => {
    const analytics = {
      path: '/src/assets/fintech-review.webp',
      alt: 'Illustrative analytics workspace',
      illustrative: true,
    };
    expect(mediaSchema.parse({ ...mediaSource, analytics }).analytics).toEqual(
      analytics,
    );
    for (const value of [
      undefined,
      null,
      '',
      { path: '', alt: '', illustrative: true },
    ])
      expect(
        mediaSchema.parse({ ...mediaSource, analytics: value }).analytics,
      ).toBeNull();
    for (const value of [
      { ...analytics, path: '/src/assets/analytics.svg' },
      { ...analytics, path: 'https://example.com/analytics.webp' },
      { ...analytics, alt: '' },
      { path: '', alt: 'A partial description', illustrative: true },
    ])
      expect(
        mediaSchema.safeParse({ ...mediaSource, analytics: value }).success,
      ).toBe(false);
  });
  it('validates an analytics image as a real raster source before publishing', async () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'folio-analytics-media-'));
    const repositoryRoot = new URL('../../', import.meta.url);
    try {
      for (const path of [
        'src/data',
        'src/content',
        'src/assets',
        'public/documents',
        '.pages.yml',
      ])
        cpSync(new URL(path, repositoryRoot), join(fixtureRoot, path), {
          recursive: true,
        });
      const fixtureMedia = {
        ...mediaSource,
        analytics: {
          path: '/src/assets/alpine.webp',
          alt: 'Isolated analytics image validation fixture',
          illustrative: true,
        },
      };
      const saveMedia = () =>
        writeFileSync(
          join(fixtureRoot, 'src/data/media.json'),
          JSON.stringify(fixtureMedia),
        );
      saveMedia();
      expect(
        (await validateRepositoryContent(fixtureRoot)).media.analytics?.path,
      ).toBe('/src/assets/alpine.webp');
      fixtureMedia.analytics.path = '/src/assets/missing-analytics.webp';
      saveMedia();
      await expect(validateRepositoryContent(fixtureRoot)).rejects.toThrow(
        /ENOENT|no such file/i,
      );
      fixtureMedia.analytics.path = '/src/assets/invalid-analytics.webp';
      writeFileSync(
        join(fixtureRoot, 'src/assets/invalid-analytics.webp'),
        'This is not a raster image.',
      );
      saveMedia();
      await expect(validateRepositoryContent(fixtureRoot)).rejects.toThrow();
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});

describe('owner-provided skill self-assessment', () => {
  const skill = {
    id: 'assessment-fixture',
    order: 0,
    status: 'draft',
    visible: false,
    name: 'Isolated schema fixture',
    categoryId: 'example-category',
    proficiency: null,
  };
  it.each([undefined, null, ''])(
    'keeps an unfilled assessment unknown: %s',
    (value) => {
      const parsed = skillSchema.parse({ ...skill, selfAssessment: value });
      expect(parsed.selfAssessment).toBeNull();
      expect(parsed.proficiency).toBeNull();
    },
  );
  it.each([1, 50, 100])(
    'accepts an explicit integer self-assessment of %i',
    (value) => {
      const parsed = skillSchema.parse({
        ...skill,
        selfAssessment: value,
        proficiency: 'advanced',
      });
      expect(parsed.selfAssessment).toBe(value);
      expect(parsed.proficiency).toBe('advanced');
    },
  );
  it.each([0, -1, 101, 50.5, '75', true, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid self-assessment instead of coercing it: %s',
    (value) => {
      expect(
        skillSchema.safeParse({ ...skill, selfAssessment: value }).success,
      ).toBe(false);
    },
  );
  it('keeps existing proficiency independent when the numerical assessment is omitted', () => {
    const parsed = skillSchema.parse({ ...skill, proficiency: 'expert' });
    expect(parsed.proficiency).toBe('expert');
    expect(parsed.selfAssessment).toBeNull();
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
    const config = loadCMSConfiguration();
    expect(
      flattenCMSEditors(config.content).some(
        (entry) => entry.path === 'src/data/interface.json',
      ),
    ).toBe(true);
    const editor = cmsEditor(config, 'interface');
    editor.fields.splice(
      editor.fields.findIndex((field) => field.name === 'contact'),
      1,
    );
    expect(() => validateCMSConfiguration(JSON.stringify(config))).toThrow(
      /field coverage/i,
    );
  });
  it('exposes bounded self-assessments and removable analytics media through CMS', () => {
    const config = loadCMSConfiguration();
    const skillEditor = cmsEditor(config, 'skills');
    const assessment = cmsField(config, skillEditor.fields, 'selfAssessment');
    expect(assessment.type).toBe('number');
    expect(assessment.required).toBe(false);
    expect(assessment.options).toEqual({ min: 1, max: 100 });
    const mediaEditor = cmsEditor(config, 'media');
    expect(cmsField(config, mediaEditor.fields, 'analytics').type).toBe(
      'object',
    );
    skillEditor.fields.splice(
      skillEditor.fields.findIndex((field) => field.name === 'selfAssessment'),
      1,
    );
    expect(() => validateCMSConfiguration(JSON.stringify(config))).toThrow(
      /field coverage/i,
    );
  });
  it('rejects a string control for numeric self-assessments instead of accepting incompatible saves', () => {
    const config = loadCMSConfiguration();
    const assessment = cmsField(
      config,
      cmsEditor(config, 'skills').fields,
      'selfAssessment',
    );
    assessment.type = 'string';
    expect(() => validateCMSConfiguration(JSON.stringify(config))).toThrow(
      /field type differs.*selfAssessment/i,
    );
  });
  it('organizes editors in website order and preserves every shared snapshot with one visible owner per field', () => {
    const config = loadCMSConfiguration();
    expect(config.content.map((group) => group.name)).toEqual([
      'section_home',
      'section_highlights',
      'section_expertise',
      'section_projects',
      'section_journey',
      'section_about',
      'section_contact',
      'section_global',
      'section_media',
      'section_seo',
    ]);
    expect(
      config.content.every(
        (group) => group.type === 'group' && group.items?.length,
      ),
    ).toBe(true);
    const editors = flattenCMSEditors(config.content);
    for (const path of ['src/data/profile.json', 'src/data/interface.json']) {
      const shared = editors.filter((editor) => editor.path === path);
      expect(shared.length).toBeGreaterThan(1);
      const expectedFields = [...(shared[0]?.fields ?? [])]
        .map(({ name }) => name)
        .sort();
      const visibleFields = shared.flatMap(
        (editor) => editor.fields?.filter((field) => !field.hidden) ?? [],
      );
      expect(visibleFields.map(({ name }) => name).sort()).toEqual(
        expectedFields,
      );
      for (const editor of shared)
        expect(editor.fields?.map(({ name }) => name).sort()).toEqual(
          expectedFields,
        );
    }
  });
  it('rejects losing a hidden snapshot field or exposing the same field in two editors', () => {
    const incomplete = loadCMSConfiguration();
    const form = cmsEditor(incomplete, 'profile');
    const hiddenIndex = form.fields.findIndex((field) => field.hidden);
    expect(hiddenIndex).toBeGreaterThanOrEqual(0);
    form.fields.splice(hiddenIndex, 1);
    expect(() => validateCMSConfiguration(JSON.stringify(incomplete))).toThrow(
      /field coverage/i,
    );

    const duplicated = loadCMSConfiguration();
    const hidden = cmsEditor(duplicated, 'profile').fields.find(
      (field) => field.hidden,
    );
    expect(hidden).toBeDefined();
    if (hidden) hidden.hidden = false;
    expect(() => validateCMSConfiguration(JSON.stringify(duplicated))).toThrow(
      /field coverage/i,
    );
  });
  it('rejects merge mode that revives cleared optional values and multiple whole-array editors', () => {
    const merged = loadCMSConfiguration();
    merged.settings.content.merge = true;
    expect(() => validateCMSConfiguration(JSON.stringify(merged))).toThrow(
      /merge:false/i,
    );
    const duplicated = loadCMSConfiguration();
    duplicated.content.push({
      ...cmsEditor(duplicated, 'skills'),
      name: 'duplicate-skills',
    });
    expect(() => validateCMSConfiguration(JSON.stringify(duplicated))).toThrow(
      /arrays must have one editor/i,
    );
  });
  it('rejects missing or empty group items and destructive canonical-file operations', () => {
    for (const items of [undefined, []]) {
      const config = loadCMSConfiguration();
      const group = config.content[0];
      if (!group) throw new Error('Missing first CMS group');
      if (items === undefined) delete group.items;
      else group.items = items;
      expect(() => validateCMSConfiguration(JSON.stringify(config))).toThrow(
        /groups require at least one editor/i,
      );
    }
    for (const operation of ['delete', 'rename'] as const) {
      const config = loadCMSConfiguration();
      const editor = flattenCMSEditors(config.content).find(
        (entry) => entry.name === 'skills',
      );
      if (!editor?.operations)
        throw new Error('Missing canonical file operations');
      editor.operations[operation] = true;
      expect(() => validateCMSConfiguration(JSON.stringify(config))).toThrow(
        /preserve canonical filenames/i,
      );
    }
  });
  it('retains media-library path, type and upload-reference boundaries through component fields', () => {
    const config = loadCMSConfiguration();
    const profileEditor = cmsEditor(config, 'cv_profile');
    const cv = cmsField(config, profileEditor.fields, 'cv');
    const file = cmsField(config, cv.fields ?? [], 'path');
    expect(file.type).toBe('file');
    expect(file.options).toMatchObject({
      media: 'documents',
      extensions: ['pdf'],
    });
    const portrait = cmsField(
      config,
      cmsEditor(config, 'media').fields,
      'portrait',
    );
    expect(
      cmsField(config, portrait.fields ?? [], 'path').options,
    ).toMatchObject({ media: 'images' });
    if (!file.options) throw new Error('Missing document media options');
    file.options.media = 'images';
    expect(() => validateCMSConfiguration(JSON.stringify(config))).toThrow(
      /wrong media library/i,
    );
    const changedPath = loadCMSConfiguration();
    const imageLibrary = changedPath.media.find(
      (library) => library.name === 'images',
    );
    if (!imageLibrary) throw new Error('Missing image library');
    imageLibrary.output = '/public/images';
    expect(() => validateCMSConfiguration(JSON.stringify(changedPath))).toThrow(
      /validated local media contract/i,
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
