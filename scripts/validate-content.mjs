import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { imageMetadata } from 'astro/assets/utils';
import { parseDocument } from 'yaml';
import { z } from 'zod';
import {
  caseStudySchema,
  educationSchema,
  experienceSchema,
  expertiseSchema,
  highlightSchema,
  languageSchema,
  mediaSchema,
  interfaceSchema,
  parseContentFile,
  profileSchema,
  parsePublicProfile,
  skillSchema,
  validateContentReferences,
} from '../src/lib/content.ts';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const collectionSchemas = {
  'professional-highlights': highlightSchema,
  expertise: expertiseSchema,
  skills: skillSchema,
  'case-studies': caseStudySchema,
  experience: experienceSchema,
  education: educationSchema,
  languages: languageSchema,
};
const expectedContentPaths = [
  'src/data/profile.json',
  'src/data/media.json',
  'src/data/interface.json',
  ...Object.keys(collectionSchemas).map((name) => `src/content/${name}.json`),
];
const fileSchemas = {
  'src/data/profile.json': profileSchema,
  'src/data/media.json': mediaSchema,
  'src/data/interface.json': interfaceSchema,
  ...Object.fromEntries(
    Object.entries(collectionSchemas).map(([name, schema]) => [
      `src/content/${name}.json`,
      schema,
    ]),
  ),
};

function fieldValueSchema(schema) {
  if (schema instanceof z.ZodPipe) return fieldValueSchema(schema.out);
  if (
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodDefault
  )
    return fieldValueSchema(schema.unwrap());
  if (schema instanceof z.ZodArray) return fieldValueSchema(schema.element);
  return schema;
}

const allowedFieldTypes = new Set([
  'boolean',
  'date',
  'file',
  'image',
  'number',
  'object',
  'select',
  'string',
  'text',
]);

/** Checks our supported Pages CMS contract, not a claim of authenticated CMS verification. */
export function validateCMSConfiguration(source) {
  const document = parseDocument(source, { uniqueKeys: true });
  if (document.errors.length)
    throw new Error(`Invalid .pages.yml: ${document.errors[0].message}`);
  const config = document.toJS({ maxAliasCount: 20 });
  if (!Array.isArray(config?.content) || !Array.isArray(config?.media)) {
    throw new Error(
      'Pages CMS requires content entries and named media libraries.',
    );
  }
  const libraries = new Map(
    config.media.map((library) => [library.name, library]),
  );
  for (const [name, input, output, extensions] of [
    [
      'images',
      'src/assets',
      '/src/assets',
      ['png', 'jpg', 'jpeg', 'webp', 'avif'],
    ],
    ['documents', 'public/documents', '/documents', ['pdf']],
  ]) {
    const library = libraries.get(name);
    if (
      !library ||
      library.input !== input ||
      library.output !== output ||
      JSON.stringify(library.extensions) !== JSON.stringify(extensions) ||
      library.rename !== 'safe'
    ) {
      throw new Error(
        `Pages CMS ${name} library must match the validated local media contract.`,
      );
    }
  }
  const paths = config.content.map((entry) => entry.path).sort();
  if (
    JSON.stringify(paths) !== JSON.stringify([...expectedContentPaths].sort())
  ) {
    throw new Error(
      'Pages CMS must expose every canonical profile, media, and collection file exactly once.',
    );
  }
  const components = config.components ?? {};
  const names = new Set();
  const validateFields = (fields, context, schema) => {
    if (!Array.isArray(fields) || fields.length === 0)
      throw new Error(`Missing CMS fields in ${context}.`);
    const fieldNames = new Set();
    const valueSchema = fieldValueSchema(schema);
    if (!(valueSchema instanceof z.ZodObject))
      throw new Error(`CMS fields require a typed object in ${context}.`);
    const expectedFields = Object.keys(valueSchema.shape).sort();
    if (
      JSON.stringify(fields.map((field) => field.name).sort()) !==
      JSON.stringify(expectedFields)
    ) {
      throw new Error(
        `CMS field coverage differs from the canonical schema in ${context}.`,
      );
    }
    for (const field of fields) {
      if (!field.name || fieldNames.has(field.name))
        throw new Error(`Duplicate or missing CMS field in ${context}.`);
      fieldNames.add(field.name);
      const shape = field.component
        ? { ...components[field.component], ...field }
        : field;
      if (
        (field.component && (!components[field.component] || field.type)) ||
        !allowedFieldTypes.has(shape.type)
      ) {
        throw new Error(`Unsupported CMS field ${context}.${field.name}.`);
      }
      if (shape.type === 'object')
        validateFields(
          shape.fields,
          `${context}.${field.name}`,
          valueSchema.shape[field.name],
        );
      if (shape.type === 'image' || shape.type === 'file') {
        const expected = shape.type === 'image' ? 'images' : 'documents';
        if (shape.options?.media !== expected)
          throw new Error(`Wrong media library in ${context}.${field.name}.`);
      }
      const pattern = shape.pattern?.regex ?? shape.pattern;
      if (pattern) new RegExp(pattern);
    }
  };
  for (const entry of config.content) {
    if (
      !entry.name ||
      names.has(entry.name) ||
      entry.type !== 'file' ||
      entry.format !== 'json'
    ) {
      throw new Error(
        'CMS entries require unique names and the canonical JSON file format.',
      );
    }
    names.add(entry.name);
    if (entry.path.startsWith('src/content/') && entry.list !== true) {
      throw new Error(`CMS ${entry.name} must edit a top-level JSON array.`);
    }
    validateFields(entry.fields, entry.name, fileSchemas[entry.path]);
  }
  return config;
}

async function containedFile(root, path) {
  const rootPath = await realpath(root);
  const file = await realpath(resolve(root, path));
  const within = relative(rootPath, file);
  if (
    within.startsWith(`..${sep}`) ||
    within === '..' ||
    within.startsWith(sep)
  ) {
    throw new Error(`Media must remain inside the repository: ${path}`);
  }
  const info = await stat(file);
  if (!info.isFile()) throw new Error(`Expected a regular file: ${path}`);
  return { file, size: info.size };
}

/** Shared local gate for dev/CI and isolated CMS save, replacement, rollback tests. */
export async function validateRepositoryContent(root = defaultRoot) {
  const json = async (path) =>
    JSON.parse(await readFile(resolve(root, path), 'utf8'));
  const profile = parsePublicProfile(await json('src/data/profile.json'));
  const media = mediaSchema.parse(await json('src/data/media.json'));
  const interfaceContent = interfaceSchema.parse(
    await json('src/data/interface.json'),
  );
  const collections = {};
  for (const [name, schema] of Object.entries(collectionSchemas)) {
    collections[name] = parseContentFile(
      await readFile(resolve(root, `src/content/${name}.json`), 'utf8'),
      schema,
    );
  }
  validateContentReferences({
    expertise: collections.expertise,
    skills: collections.skills,
    caseStudies: collections['case-studies'],
    experience: collections.experience,
  });
  validateCMSConfiguration(await readFile(resolve(root, '.pages.yml'), 'utf8'));
  const imagePaths = new Set([
    media.portrait.path,
    media.alpine.path,
    media.contact.path,
    ...(media.logo ? [media.logo.path] : []),
    ...media.projects.map((image) => image.path),
    ...(profile.seo.socialImage ? [profile.seo.socialImage.path] : []),
    ...collections['case-studies'].flatMap((entry) =>
      entry.image ? [entry.image.path] : [],
    ),
  ]);
  for (const path of imagePaths) {
    const { file, size } = await containedFile(root, path.slice(1));
    if (size > 12 * 1024 * 1024)
      throw new Error(`Image exceeds the 12 MiB source limit: ${path}`);
    const metadata = await imageMetadata(await readFile(file), path);
    if (
      !['png', 'jpg', 'jpeg', 'webp', 'avif'].includes(metadata.format) ||
      metadata.width < 1 ||
      metadata.height < 1 ||
      metadata.width * metadata.height > 40_000_000
    ) {
      throw new Error(`Unsupported or oversized raster image: ${path}`);
    }
  }
  if (profile.cv) {
    const { file, size } = await containedFile(
      root,
      `public${profile.cv.path}`,
    );
    const pdf = await readFile(file);
    if (
      size > 10 * 1024 * 1024 ||
      !pdf.subarray(0, 8).toString('ascii').startsWith('%PDF-') ||
      !pdf.subarray(-2048).includes(Buffer.from('%%EOF'))
    ) {
      throw new Error(
        'The selected CV must be a real PDF no larger than 10 MiB.',
      );
    }
  }
  return {
    profile,
    media,
    interfaceContent,
    collections,
    imageCount: imagePaths.size,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const result = await validateRepositoryContent();
    console.log(
      `Content valid: profile, ${Object.keys(collectionSchemas).length} collections, Pages CMS, ${result.imageCount} raster sources${result.profile.cv ? ', PDF CV' : ' (external CV view)'}.`,
    );
  } catch (error) {
    console.error(
      'Content validation failed:',
      error instanceof Error ? error.message : 'Unknown validation error.',
    );
    process.exitCode = 1;
  }
}
