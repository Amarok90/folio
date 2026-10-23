import { describe, expect, it } from 'vitest';
import { profile } from '../../src/data/profile';
import {
  caseStudySchema,
  contentIdSchema,
  educationSchema,
  experienceSchema,
  highlightSchema,
  httpsUrlSchema,
  isPublished,
  languageSchema,
  localAssetPathSchema,
  monthSchema,
  parseContentFile,
  parsePublishedContentFile,
  profileSchema,
  publicationSchema,
  publishedEntries,
  skillSchema,
  validateContentReferences,
} from '../../src/lib/content';

// Isolated schema fixtures, never imported by application content or rendering.
const metadata = {
  id: 'example-record',
  order: 0,
  status: 'draft' as const,
  visible: false,
};
const exampleExperience = {
  ...metadata,
  role: 'Example role',
  organization: 'Example organization',
  location: null,
  summary: null,
  startDate: '2020-01',
  endDate: '2021-01',
  current: false,
  achievements: [],
  skillIds: [],
};

describe('profile integrity', () => {
  it('contains only supplied identity and keeps unverified professional facts absent', () => {
    expect(profile.identity).toEqual({
      name: 'Konstantin Arutjunov',
      jobTitle: 'Senior IT Business Analyst',
    });
    expect(profile.hero.summary).toBeNull();
    expect(profile.contact.email).toBeNull();
    expect(profile.contact.openToRelocation).toBeNull();
    expect(profile.contact.links).toEqual([]);
    expect(profile.cv).toBeNull();
    expect(isPublished(profile)).toBe(false);
  });

  it('rejects missing identity, empty claims, unknown fields, and invalid contacts', () => {
    expect(
      profileSchema.safeParse({
        ...profile,
        identity: { name: profile.identity.name },
      }).success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({
        ...profile,
        hero: { headline: null, summary: ' ' },
      }).success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({ ...profile, ungovernedField: 'value' }).success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({
        ...profile,
        contact: { ...profile.contact, email: 'invalid' },
      }).success,
    ).toBe(false);
  });

  it('defaults omitted singleton publication controls to a hidden draft', () => {
    const defaults = profileSchema.parse({
      ...profile,
      status: undefined,
      visible: undefined,
    });
    expect(defaults.status).toBe('draft');
    expect(defaults.visible).toBe(false);
    expect(isPublished(defaults)).toBe(false);
  });

  it('requires complete CV metadata and a local PDF before exposing a download', () => {
    expect(
      profileSchema.safeParse({
        ...profile,
        cv: {
          path: '/documents/example.pdf',
          filename: 'example.pdf',
          updatedAt: '2025-02-28',
          language: 'en',
        },
      }).success,
    ).toBe(true);
    expect(
      profileSchema.safeParse({
        ...profile,
        cv: {
          path: 'https://example.com/example.pdf',
          filename: 'example.pdf',
          updatedAt: '2025-02-30',
          language: 'en',
        },
      }).success,
    ).toBe(false);
  });
});

describe('publication and ordering', () => {
  it('defaults to hidden draft and requires both publication switches', () => {
    expect(publicationSchema.parse({})).toEqual({
      status: 'draft',
      visible: false,
    });
    expect(isPublished({ status: 'draft', visible: true })).toBe(false);
    expect(isPublished({ status: 'published', visible: false })).toBe(false);
    expect(isPublished({ status: 'published', visible: true })).toBe(true);
  });

  it('filters drafts, orders deterministically, and does not mutate source records', () => {
    const entries = [
      {
        id: 'b',
        data: { order: 1, status: 'published' as const, visible: true },
      },
      {
        id: 'draft',
        data: { order: 0, status: 'draft' as const, visible: true },
      },
      {
        id: 'a',
        data: { order: 1, status: 'published' as const, visible: true },
      },
      {
        id: 'hidden',
        data: { order: 0, status: 'published' as const, visible: false },
      },
      {
        id: 'first',
        data: { order: 0, status: 'published' as const, visible: true },
      },
    ];
    const original = [...entries];
    expect(publishedEntries(entries).map((entry) => entry.id)).toEqual([
      'first',
      'a',
      'b',
    ]);
    expect(entries).toEqual(original);
  });

  it('rejects duplicate CMS identifiers rather than silently replacing a record', () => {
    const record = {
      ...metadata,
      value: 0,
      label: 'Example count',
      context: null,
    };
    expect(() =>
      parseContentFile(JSON.stringify([record, record]), highlightSchema),
    ).toThrow('Duplicate content identifier: example-record');
    expect(() => parseContentFile('{}', highlightSchema)).toThrow();
    expect(() => parseContentFile('invalid JSON', highlightSchema)).toThrow();
  });

  it('excludes drafts and hidden records before they enter public Astro collections', () => {
    const record = {
      ...metadata,
      value: 0,
      label: 'Example count',
      context: null,
    };
    const source = [
      record,
      { ...record, id: 'hidden', status: 'published' },
      { ...record, id: 'visible-draft', visible: true },
      { ...record, id: 'public', status: 'published', visible: true },
    ];
    expect(
      parsePublishedContentFile(JSON.stringify(source), highlightSchema).map(
        (entry) => entry.id,
      ),
    ).toEqual(['public']);
    expect(() =>
      parsePublishedContentFile(
        JSON.stringify([{ ...record, value: null }]),
        highlightSchema,
      ),
    ).toThrow();
  });
});

describe('content constraints', () => {
  it('preserves an explicit zero while rejecting a missing highlight value', () => {
    expect(
      highlightSchema.parse({
        ...metadata,
        value: 0,
        label: 'Example count',
        context: null,
      }).value,
    ).toBe(0);
    expect(
      highlightSchema.safeParse({
        ...metadata,
        label: 'Example count',
        context: null,
      }).success,
    ).toBe(false);
  });

  it.each([Infinity, -Infinity, NaN])(
    'rejects non-finite highlight value %s',
    (value) => {
      expect(
        highlightSchema.safeParse({
          ...metadata,
          value,
          label: 'Example count',
          context: null,
        }).success,
      ).toBe(false);
    },
  );

  it.each(['Example Record', '../record', '', 'example_record'])(
    'rejects unstable identifier %j',
    (value) => expect(contentIdSchema.safeParse(value).success).toBe(false),
  );

  it('does not turn missing skill or language proficiency into a default level', () => {
    expect(
      skillSchema.parse({
        ...metadata,
        name: 'Example skill',
        categoryId: 'example',
        proficiency: null,
      }).proficiency,
    ).toBeNull();
    expect(
      languageSchema.parse({
        ...metadata,
        name: 'Example',
        code: 'en',
        proficiency: null,
      }).proficiency,
    ).toBeNull();
    expect(
      skillSchema.safeParse({
        ...metadata,
        name: 'Example skill',
        categoryId: 'example',
      }).success,
    ).toBe(false);
  });

  it('requires case-study challenge and contribution without forcing fabricated outcomes', () => {
    const example = {
      ...metadata,
      title: 'Example case study',
      summary: 'Example schema validation summary',
      sector: null,
      challenge: 'Example challenge',
      contribution: 'Example contribution',
      outcomes: [],
      limitations: [],
      skillIds: [],
      image: null,
      link: null,
    };
    expect(caseStudySchema.parse(example).outcomes).toEqual([]);
    expect(
      caseStudySchema.safeParse({ ...example, contribution: '' }).success,
    ).toBe(false);
  });

  it('validates month precision and chronology for experience and education', () => {
    expect(monthSchema.safeParse('2020-01').success).toBe(true);
    expect(monthSchema.safeParse('2020-13').success).toBe(false);
    expect(monthSchema.safeParse('2020-01-01').success).toBe(false);
    expect(experienceSchema.safeParse(exampleExperience).success).toBe(true);
    expect(
      experienceSchema.safeParse({ ...exampleExperience, endDate: '2019-12' })
        .success,
    ).toBe(false);
    expect(
      experienceSchema.safeParse({ ...exampleExperience, current: true })
        .success,
    ).toBe(false);
    expect(
      experienceSchema.safeParse({ ...exampleExperience, endDate: null })
        .success,
    ).toBe(false);
    expect(
      experienceSchema.safeParse({
        ...exampleExperience,
        current: true,
        endDate: null,
      }).success,
    ).toBe(true);
    expect(
      educationSchema.safeParse({
        ...metadata,
        startDate: '2020-01',
        endDate: '2019-12',
        current: false,
        institution: 'Example institution',
        qualification: 'Example qualification',
        field: null,
      }).success,
    ).toBe(false);
  });
});

describe('safe content URLs', () => {
  it.each([
    'javascript:alert(1)',
    'http://example.com',
    '//example.com',
    'https://user:secret@example.com',
    'not a URL',
  ])('rejects unsafe external URL %j without throwing', (value) => {
    expect(httpsUrlSchema.safeParse(value).success).toBe(false);
  });

  it.each([
    '/../private.pdf',
    '//example.com/file.pdf',
    '/images/file.jpg?query=1',
    '/.env',
    '/',
  ])('rejects unsafe asset path %j', (value) =>
    expect(localAssetPathSchema.safeParse(value).success).toBe(false),
  );

  it('accepts safe HTTPS links and local static assets', () => {
    expect(
      httpsUrlSchema.safeParse('https://example.com/profile').success,
    ).toBe(true);
    expect(localAssetPathSchema.safeParse('/images/example.webp').success).toBe(
      true,
    );
  });
});

describe('content reference integrity', () => {
  const category = {
    id: 'example-category',
    status: 'published' as const,
    visible: true,
  };
  const skill = {
    id: 'example-skill',
    categoryId: category.id,
    status: 'published' as const,
    visible: true,
  };

  it('allows empty collections and valid published references', () => {
    expect(() =>
      validateContentReferences({
        expertise: [],
        skills: [],
        caseStudies: [],
        experience: [],
      }),
    ).not.toThrow();
    expect(() =>
      validateContentReferences({
        expertise: [category],
        skills: [skill],
        caseStudies: [
          {
            id: 'example-case',
            skillIds: [skill.id],
            status: 'published',
            visible: true,
          },
        ],
        experience: [],
      }),
    ).not.toThrow();
  });

  it('fails on missing references and published content depending on drafts', () => {
    expect(() =>
      validateContentReferences({
        expertise: [],
        skills: [skill],
        caseStudies: [],
        experience: [],
      }),
    ).toThrow('missing expertise');
    expect(() =>
      validateContentReferences({
        expertise: [{ ...category, status: 'draft' }],
        skills: [skill],
        caseStudies: [],
        experience: [],
      }),
    ).toThrow('unpublished expertise');
    expect(() =>
      validateContentReferences({
        expertise: [category],
        skills: [{ ...skill, visible: false }],
        caseStudies: [
          {
            id: 'example-case',
            skillIds: [skill.id],
            status: 'published',
            visible: true,
          },
        ],
        experience: [],
      }),
    ).toThrow('unpublished skill');
    expect(() =>
      validateContentReferences({
        expertise: [],
        skills: [],
        caseStudies: [],
        experience: [
          {
            id: 'example-experience',
            skillIds: ['missing'],
            status: 'draft',
            visible: false,
          },
        ],
      }),
    ).toThrow('missing skill');
  });
});
