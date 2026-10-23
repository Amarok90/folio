import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import {
  caseStudySchema,
  educationSchema,
  experienceSchema,
  expertiseSchema,
  highlightSchema,
  languageSchema,
  parsePublishedContentFile,
  skillSchema,
  validateContentReferences,
} from './lib/content';
import expertiseSource from './content/expertise.json';
import skillsSource from './content/skills.json';
import caseStudiesSource from './content/case-studies.json';
import experienceSource from './content/experience.json';

// Fail the build if CMS edits produce broken references or publish hidden dependencies.
validateContentReferences({
  expertise: expertiseSchema.array().parse(expertiseSource),
  skills: skillSchema.array().parse(skillsSource),
  caseStudies: caseStudySchema.array().parse(caseStudiesSource),
  experience: experienceSchema.array().parse(experienceSource),
});

const professionalHighlights = defineCollection({
  loader: file('src/content/professional-highlights.json', {
    parser: (source) => parsePublishedContentFile(source, highlightSchema),
  }),
  schema: highlightSchema,
});

const expertise = defineCollection({
  loader: file('src/content/expertise.json', {
    parser: (source) => parsePublishedContentFile(source, expertiseSchema),
  }),
  schema: expertiseSchema,
});

const skills = defineCollection({
  loader: file('src/content/skills.json', {
    parser: (source) => parsePublishedContentFile(source, skillSchema),
  }),
  schema: skillSchema,
});

const caseStudies = defineCollection({
  loader: file('src/content/case-studies.json', {
    parser: (source) => parsePublishedContentFile(source, caseStudySchema),
  }),
  schema: caseStudySchema,
});

const experience = defineCollection({
  loader: file('src/content/experience.json', {
    parser: (source) => parsePublishedContentFile(source, experienceSchema),
  }),
  schema: experienceSchema,
});

const education = defineCollection({
  loader: file('src/content/education.json', {
    parser: (source) => parsePublishedContentFile(source, educationSchema),
  }),
  schema: educationSchema,
});

const languages = defineCollection({
  loader: file('src/content/languages.json', {
    parser: (source) => parsePublishedContentFile(source, languageSchema),
  }),
  schema: languageSchema,
});

export const collections = {
  professionalHighlights,
  expertise,
  skills,
  caseStudies,
  experience,
  education,
  languages,
};
