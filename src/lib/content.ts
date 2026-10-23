import { z } from 'zod';

const text = z.string().trim().min(1);
const nullableText = text.nullable();

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
    proficiency: z
      .enum(['foundational', 'working', 'advanced', 'expert'])
      .nullable(),
  })
  .strict();

export const caseStudySchema = recordSchema
  .extend({
    title: text,
    summary: text,
    sector: nullableText,
    challenge: text,
    contribution: text,
    outcomes: z.array(text),
    limitations: z.array(text),
    skillIds: z.array(contentIdSchema),
    image: z
      .object({
        path: localAssetPathSchema,
        alt: text,
      })
      .strict()
      .nullable(),
    link: httpsUrlSchema.nullable(),
  })
  .strict();

const datedRecordSchema = recordSchema.extend({
  startDate: monthSchema,
  endDate: monthSchema.nullable(),
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
    achievements: z.array(text),
    skillIds: z.array(contentIdSchema),
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
      })
      .strict(),
    about: z
      .object({
        summary: nullableText,
        interests: z.array(text),
      })
      .strict(),
    contact: z
      .object({
        email: z.email().nullable(),
        location: nullableText,
        openToRelocation: z.boolean().nullable(),
        availability: nullableText,
        links: z.array(z.object({ label: text, url: httpsUrlSchema }).strict()),
      })
      .strict(),
    cv: z
      .object({
        path: localAssetPathSchema.refine(
          (value) => /\.pdf$/i.test(value),
          'The CV must be a PDF.',
        ),
        filename: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.pdf$/i),
        updatedAt: z.iso.date(),
        language: text,
      })
      .strict()
      .nullable(),
    seo: z
      .object({
        title: nullableText,
        description: nullableText,
        socialImage: z
          .object({ path: localAssetPathSchema, alt: text })
          .strict()
          .nullable(),
      })
      .strict(),
  })
  .strict();

export type Profile = z.infer<typeof profileSchema>;
export type Publication = z.infer<typeof publicationSchema>;

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
