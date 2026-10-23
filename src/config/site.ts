import { profile } from '../data/profile';
import { interfaceContent } from '../data/interface';
import { resolveIndexability } from './deployment';

export const site = {
  brand: interfaceContent.brand,
  language: 'en',
  identity: profile.identity,
  title: `${profile.seo.title ?? `${profile.identity.name} — ${profile.identity.jobTitle}`} | ${interfaceContent.brand}`,
  description: profile.seo.description ?? profile.hero.summary ?? '',
  // Preview remains non-indexable until original imagery and launch review are complete.
  indexable: resolveIndexability(process.env),
  navigation: interfaceContent.navigation,
} as const;
