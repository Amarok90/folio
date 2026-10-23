import { profile } from '../data/profile';
import { resolveIndexability } from './deployment';

export const site = {
  brand: 'FOLIO',
  language: 'en',
  identity: profile.identity,
  title: `${profile.seo.title ?? `${profile.identity.name} — ${profile.identity.jobTitle}`} | FOLIO`,
  description: profile.seo.description ?? profile.hero.summary ?? '',
  // Preview remains non-indexable until original imagery and launch review are complete.
  indexable: resolveIndexability(process.env),
  navigation: [
    { label: 'About', href: '#about' },
    { label: 'Expertise', href: '#expertise' },
    { label: 'Projects', href: '#projects' },
    { label: 'Experience', href: '#experience' },
    { label: 'Contact', href: '#contact' },
  ],
} as const;
