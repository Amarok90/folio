import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import {
  caseStudySchema,
  educationSchema,
  experienceSchema,
  expertiseSchema,
  highlightSchema,
  languageSchema,
  parseContentFile,
  parsePublishedContentFile,
  skillSchema,
  validateContentReferences,
} from './lib/content';
// Raw imports let the canonical parser handle Pages CMS's blank empty-list format.
import expertiseSource from './content/expertise.json?raw';
import skillsSource from './content/skills.json?raw';
import caseStudiesSource from './content/case-studies.json?raw';
import experienceSource from './content/experience.json?raw';
import highlightsSource from './content/professional-highlights.json?raw';
import educationSource from './content/education.json?raw';
import languagesSource from './content/languages.json?raw';

// Astro can log and skip a failed file loader. Validate every collection first so
// invalid records fail even a direct Astro build, rather than disappearing silently.
parseContentFile(highlightsSource, highlightSchema);
parseContentFile(educationSource, educationSchema);
parseContentFile(languagesSource, languageSchema);
// Fail the build if CMS edits produce broken references or publish hidden dependencies.
validateContentReferences({
  expertise: parseContentFile(expertiseSource, expertiseSchema),
  skills: parseContentFile(skillsSource, skillSchema),
  caseStudies: parseContentFile(caseStudiesSource, caseStudySchema),
  experience: parseContentFile(experienceSource, experienceSchema),
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
