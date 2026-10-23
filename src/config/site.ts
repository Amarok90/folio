import { profile } from '../data/profile';

export const site = {
  brand: 'FOLIO',
  language: 'en',
  identity: profile.identity,
  title: 'FOLIO — Foundation preview',
  description:
    'The design and technical foundation for Konstantin Arutjunov’s professional portfolio. Development preview.',
  // Task 1 is never indexable, even when a deployment origin is supplied.
  indexable: false,
  navigation: [
    { label: 'Overview', href: '#overview' },
    { label: 'Design system', href: '#design-system' },
    { label: 'Components', href: '#components' },
    { label: 'Content', href: '#content' },
    { label: 'Readiness', href: '#readiness' },
  ],
} as const;
