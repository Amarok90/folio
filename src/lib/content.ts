import { z } from 'zod';

const text = z.string().trim().min(1);
// Pages CMS clears optional text inputs to an empty string; preserve this as unknown.
const nullableText = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  text.nullable(),
);

/** Only local raster sources may enter Astro's image pipeline. SVG stays code-owned. */
export const imageAssetPathSchema = z
  .string()
  .regex(
    /^\/src\/assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9][a-zA-Z0-9_.-]*\.(?:[pP][nN][gG]|[jJ][pP][eE]?[gG]|[wW][eE][bB][pP]|[aA][vV][iI][fF])$/,
    'Choose a PNG, JPEG, WebP or AVIF image from the Images library.',
  );

const optionalObject = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  z.preprocess((value) => {
    if (
      value === '' ||
      value === undefined ||
      (value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.entries(value).every(
          ([key, field]) =>
            Object.keys(schema.shape).includes(key) &&
            (field === '' ||
              field === null ||
              field === undefined ||
              (key === 'illustrative' && typeof field === 'boolean')),
        ))
    )
      return null;
    return value;
  }, schema.nullable());

export const imageSchema = z
  .object({
    path: imageAssetPathSchema,
    alt: text,
    illustrative: z.boolean().default(false),
  })
  .strict();

export const mediaSchema = z
  .object({
    portrait: z
      .object({ path: imageAssetPathSchema, alt: text, temporary: z.boolean() })
      .strict(),
    aboutPortrait: optionalObject(
      z.object({ path: imageAssetPathSchema, alt: text }).strict(),
    ),
    alpine: z.object({ path: imageAssetPathSchema }).strict(),
    contact: z.object({ path: imageAssetPathSchema }).strict(),
    analytics: optionalObject(imageSchema),
    logo: optionalObject(
      z.object({ path: imageAssetPathSchema, alt: text }).strict(),
    ),
    projects: z.array(imageSchema).max(6),
  })
  .strict();

/** Presentation copy is separate from professional facts and never contains executable markup. */
export const sectionTargetSchema = z.enum([
  '#home',
  '#highlights',
  '#expertise',
  '#projects',
  '#experience',
  '#about',
  '#contact',
]);
const shortCopy = text.max(120);
const paragraphCopy = text.max(1200);
const headingLines = z.array(shortCopy).min(1).max(3);
export const sectionActionSchema = z
  .object({ label: text.max(60), href: sectionTargetSchema })
  .strict();
const sectionIntroSchema = z
  .object({ eyebrow: shortCopy, titleLines: headingLines })
  .strict();
export const interfaceSchema = z
  .object({
    brand: text.max(24),
    navigation: z
      .array(
        z.object({ label: text.max(28), href: sectionTargetSchema }).strict(),
      )
      .min(1)
      .max(5)
      .refine(
        (links) =>
          new Set(links.map((link) => link.href)).size === links.length,
        'Navigation destinations must be unique.',
      ),
    actions: z
      .object({
        cvViewLabel: text
          .max(60)
          .refine(
            (value) => !/download/i.test(value),
            'An external CV view must not be labelled as a download.',
          ),
        cvDownloadLabel: text.max(60),
        cvPendingLabel: text.max(60),
      })
      .strict(),
    common: z
      .object({
        portraitNote: shortCopy,
        relocationLabel: shortCopy,
        pendingLabel: shortCopy,
        ongoingLabel: shortCopy,
        locationLabel: shortCopy,
        emailLabel: shortCopy,
        linkedInLabel: shortCopy,
        availabilityLabel: shortCopy,
        unconfirmedLabel: shortCopy,
      })
      .strict(),
    hero: z
      .object({
        primaryAction: sectionActionSchema,
        locationPrefix: shortCopy,
        signature: z.array(text.max(30)).length(4),
      })
      .strict(),
    highlights: z
      .object({ title: shortCopy, emptyMessage: paragraphCopy })
      .strict(),
    expertise: sectionIntroSchema
      .extend({
        description: paragraphCopy,
        action: sectionActionSchema,
        emptyMessage: paragraphCopy,
        emptySkillsMessage: paragraphCopy,
        footnote: paragraphCopy,
        proficiencyNote: paragraphCopy,
        partialProficiencyNote: paragraphCopy,
      })
      .strict(),
    projects: sectionIntroSchema
      .extend({
        description: paragraphCopy,
        emptyDescription: paragraphCopy,
        action: sectionActionSchema,
        detailsLabel: shortCopy,
        challengeHeading: shortCopy,
        contributionHeading: shortCopy,
        limitationsHeading: shortCopy,
        linkedInSourceLabel: shortCopy,
        sourceLabel: shortCopy,
        illustrativeCaption: shortCopy,
        emptyMessage: paragraphCopy,
      })
      .strict(),
    journey: sectionIntroSchema
      .extend({
        description: paragraphCopy,
        emptyDescription: paragraphCopy,
        earlierLabel: shortCopy,
        detailsLabel: shortCopy,
        presentLabel: shortCopy,
        currentLabel: shortCopy.default('Current position'),
        emptyMessage: paragraphCopy,
      })
      .strict(),
    about: sectionIntroSchema
      .extend({
        action: sectionActionSchema,
        approachTitle: shortCopy,
        educationTitle: shortCopy,
        languagesTitle: shortCopy,
        interestsTitle: shortCopy.default('Interests'),
        emptyDescription: paragraphCopy,
      })
      .strict(),
    contact: sectionIntroSchema
      .extend({
        descriptionLines: z.array(paragraphCopy).min(1).max(3),
        primaryActionLabel: text.max(60),
        preferredChannel: z.enum(['email', 'linkedin']),
        linkedInActionLabel: shortCopy,
        missingMessage: paragraphCopy,
      })
      .strict(),
    footer: z
      .object({
        copyrightNotice: shortCopy,
        backToTopLabel: shortCopy,
        privacyLabel: shortCopy,
        preferencesLabel: shortCopy,
      })
      .strict(),
  })
  .strict();

export const contentIdSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Use a stable lowercase kebab-case identifier.',
  );

export const httpsUrlSchema = z.url().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}, 'Public links must use HTTPS and cannot contain credentials.');

export const localAssetPathSchema = z
  .string()
  .regex(
    /^\/(?!\/)(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9][a-zA-Z0-9_.-]*$/,
    'Use an absolute local asset path without query strings.',
  )
  .refine(
    (value) =>
      !value.split('/').some((segment) => segment === '.' || segment === '..'),
    'Asset paths must not traverse directories.',
  );

/** Month precision avoids inventing exact employment or education dates. */
export const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM.');

export const publicationSchema = z.object({
  status: z.enum(['draft', 'published']).default('draft'),
  visible: z.boolean().default(false),
});

const recordSchema = publicationSchema.extend({
  id: contentIdSchema,
  order: z.number().int().nonnegative(),
});

export const highlightSchema = recordSchema
  .extend({
    value: z.union([text, z.number()]),
    label: text,
    context: nullableText,
  })
  .strict();

export const expertiseSchema = recordSchema
  .extend({
    title: text,
    description: nullableText,
  })
  .strict();

export const skillSchema = recordSchema
  .extend({
    name: text,
    categoryId: contentIdSchema,
    // No invented percentage or implicit proficiency for an unknown skill.
    proficiency: z.preprocess(
      (value) => (value === '' || value === undefined ? null : value),
      z.enum(['foundational', 'working', 'advanced', 'expert']).nullable(),
    ),
    // An owner-provided self-assessment is separate from an evidenced proficiency level.
    selfAssessment: z.preprocess(
      (value) => (value === '' || value === undefined ? null : value),
      z.number().int().min(1).max(100).nullable(),
    ),
  })
  .strict();

export type SkillProficiency = z.infer<typeof skillSchema>['proficiency'];

export const caseStudySchema = recordSchema
  .extend({
    title: text,
    summary: text,
    sector: nullableText,
    challenge: text,
    contribution: text,
    outcomes: z.array(text).default([]),
    limitations: z.array(text).default([]),
    skillIds: z.array(contentIdSchema).default([]),
    image: optionalObject(imageSchema),
    link: z.preprocess(
      (value) => (value === '' || value === undefined ? null : value),
      httpsUrlSchema.nullable(),
    ),
  })
  .strict();

const datedRecordSchema = recordSchema.extend({
  startDate: monthSchema,
  endDate: z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    monthSchema.nullable(),
  ),
  current: z.boolean(),
});

function validateDateRange(
  value: { startDate: string; endDate: string | null; current: boolean },
  context: z.RefinementCtx,
): void {
  if (value.current && value.endDate !== null) {
    context.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: 'A current record cannot have an end date.',
    });
  }
  if (!value.current && value.endDate === null) {
    context.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: 'Provide an end date or explicitly mark the record as current.',
    });
  }
  if (value.endDate !== null && value.endDate < value.startDate) {
    context.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: 'The end date cannot precede the start date.',
    });
  }
}

export const experienceSchema = datedRecordSchema
  .extend({
    role: text,
    organization: text,
    location: nullableText,
    summary: nullableText,
    achievements: z.array(text).default([]),
    skillIds: z.array(contentIdSchema).default([]),
  })
  .strict()
  .superRefine(validateDateRange);

export const educationSchema = datedRecordSchema
  .extend({
    institution: text,
    qualification: text,
    field: nullableText,
  })
  .strict()
  .superRefine(validateDateRange);

export const languageSchema = recordSchema
  .extend({
    name: text,
    code: z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/),
    proficiency: nullableText,
  })
  .strict();

export const profileSchema = publicationSchema
  .extend({
    identity: z
      .object({
        name: text,
        jobTitle: text,
      })
      .strict(),
    hero: z
      .object({
        headline: nullableText,
        summary: nullableText,
        approach: z.array(text).min(1).max(4),
      })
      .strict(),
    about: z
      .object({
        summary: nullableText,
        interests: z.array(text).default([]),
        approach: z
          .array(z.object({ title: text, description: text }).strict())
          .min(1)
          .max(4),
      })
      .strict(),
    contact: z
      .object({
        email: z.preprocess(
          (value) => (value === '' || value === undefined ? null : value),
          z.email().nullable(),
        ),
        location: nullableText,
        openToRelocation: z.boolean().nullable().default(null),
        availability: nullableText,
        links: z
          .array(
            z
              .object({
                label: text,
                url: httpsUrlSchema.refine((value) => {
                  const url = new URL(value);
                  return (
                    ['linkedin.com', 'www.linkedin.com'].includes(
                      url.hostname,
                    ) &&
                    /^\/in\/[^/]+\/?$/.test(url.pathname) &&
                    !url.search &&
                    !url.hash
                  );
                }, 'Contact links are limited to a LinkedIn profile; use the separate email field for email.'),
              })
              .strict(),
          )
          .max(1),
      })
      .strict(),
    cv: optionalObject(
      z
        .object({
          path: localAssetPathSchema.refine(
            (value) =>
              /^\/documents\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9][a-zA-Z0-9._-]*\.pdf$/i.test(
                value,
              ),
            'The CV must be a PDF.',
          ),
          filename: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.pdf$/i),
          updatedAt: z.iso.date(),
          language: text,
        })
        .strict(),
    ),
    cvPreviewUrl: z.preprocess(
      (value) => (value === '' || value === undefined ? null : value),
      httpsUrlSchema.nullable().default(null),
    ),
    seo: z
      .object({
        title: nullableText,
        description: nullableText,
        socialImage: optionalObject(
          z.object({ path: imageAssetPathSchema, alt: text }).strict(),
        ),
      })
      .strict(),
  })
  .strict();

export type Profile = z.infer<typeof profileSchema>;
export type Publication = z.infer<typeof publicationSchema>;

/** The site requires one public identity; drafts belong in the individual collections. */
export function parsePublicProfile(source: unknown): Profile {
  const parsed = profileSchema.parse(source);
  if (!isPublished(parsed)) {
    throw new Error(
      'The required site profile must remain Published and visible. Use collection drafts to hide individual records.',
    );
  }
  return parsed;
}

/** A record needs both explicit publication and visibility before it can render publicly. */
export function isPublished(record: Publication): boolean {
  return record.status === 'published' && record.visible;
}

export function publishedEntries<
  T extends { id: string; data: Publication & { order: number } },
>(entries: readonly T[]): T[] {
  return entries
    .filter((entry) => isPublished(entry.data))
    .sort((left, right) => {
      const order = left.data.order - right.data.order;
      return order || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
    });
}

/** JSON file loaders use the same schemas as tests and reject duplicate CMS identifiers. */
export function parseContentFile<T extends { id: string }>(
  source: string,
  schema: z.ZodType<T>,
): T[] {
  const records = z.array(schema).parse(JSON.parse(source) as unknown);
  const ids = new Set<string>();
  for (const record of records) {
    if (ids.has(record.id))
      throw new Error(`Duplicate content identifier: ${record.id}`);
    ids.add(record.id);
  }
  return records;
}

/** Public collections never ingest drafts; a renderer cannot accidentally expose them. */
export function parsePublishedContentFile<
  T extends { id: string } & Publication,
>(source: string, schema: z.ZodType<T>): T[] {
  return parseContentFile(source, schema).filter(isPublished);
}

/** Validate foreign identifiers before building, including references kept in hidden drafts. */
export function validateContentReferences(data: {
  expertise: readonly (Publication & { id: string })[];
  skills: readonly (Publication & {
    id: string;
    categoryId: string;
  })[];
  caseStudies: readonly (Publication & {
    id: string;
    skillIds: readonly string[];
  })[];
  experience: readonly (Publication & {
    id: string;
    skillIds: readonly string[];
  })[];
}): void {
  const expertise = new Map(data.expertise.map((entry) => [entry.id, entry]));
  const skills = new Map(data.skills.map((entry) => [entry.id, entry]));
  for (const skill of data.skills) {
    const category = expertise.get(skill.categoryId);
    if (!category)
      throw new Error(
        `Skill ${skill.id} references missing expertise ${skill.categoryId}.`,
      );
    if (isPublished(skill) && !isPublished(category)) {
      throw new Error(
        `Published skill ${skill.id} references unpublished expertise ${category.id}.`,
      );
    }
  }
  for (const entry of [...data.caseStudies, ...data.experience]) {
    for (const id of entry.skillIds) {
      const skill = skills.get(id);
      if (!skill)
        throw new Error(`Content ${entry.id} references missing skill ${id}.`);
      if (isPublished(entry) && !isPublished(skill)) {
        throw new Error(
          `Published content ${entry.id} references unpublished skill ${id}.`,
        );
      }
    }
  }
}
