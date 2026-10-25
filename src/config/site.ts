import { profile } from '../data/profile';
import { interfaceContent } from '../data/interface';
import { resolveIndexability } from './deployment';
import { sectionTargetSchema } from '../lib/content';

export const site = {
  brand: interfaceContent.brand,
  language: 'en',
  identity: profile.identity,
  title: `${profile.seo.title ?? `${profile.identity.name} — ${profile.identity.jobTitle}`} | ${interfaceContent.brand}`,
  description: profile.seo.description ?? profile.hero.summary ?? '',
  // Only an explicit release setting enables indexing and publication presentation.
  indexable: resolveIndexability(process.env),
  // Labels and destinations stay editable; presentation follows the page's section order.
  navigation: [...interfaceContent.navigation].sort(
    (left, right) =>
      sectionTargetSchema.options.indexOf(left.href) -
      sectionTargetSchema.options.indexOf(right.href),
  ),
} as const;
