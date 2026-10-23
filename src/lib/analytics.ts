export const CONSENT_STORAGE_KEY = 'folio.consent.v1';
export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE = 180 * 24 * 60 * 60 * 1_000;

export type ConsentChoice = 'accepted' | 'rejected';
export interface ConsentRecord {
  version: typeof CONSENT_VERSION;
  choice: ConsentChoice;
  updatedAt: number;
  projectId: string;
}

export function makeConsent(
  choice: ConsentChoice,
  projectId: string,
  now = Date.now(),
): ConsentRecord {
  return { version: CONSENT_VERSION, choice, updatedAt: now, projectId };
}

/** Invalid, expired and old-purpose decisions never imply permission. */
export function parseConsent(
  value: string | null,
  projectId: string,
  now = Date.now(),
): ConsentRecord | null {
  if (!value) return null;
  try {
    const record: unknown = JSON.parse(value);
    if (!record || typeof record !== 'object') return null;
    const candidate = record as Partial<ConsentRecord>;
    if (
      candidate.version !== CONSENT_VERSION ||
      !['accepted', 'rejected'].includes(candidate.choice ?? '') ||
      candidate.projectId !== projectId ||
      typeof candidate.updatedAt !== 'number' ||
      !Number.isFinite(candidate.updatedAt) ||
      candidate.updatedAt > now ||
      now - candidate.updatedAt >= CONSENT_MAX_AGE
    ) {
      return null;
    }
    return candidate as ConsentRecord;
  } catch {
    return null;
  }
}

export const analyticsEvents = [
  'cv_view',
  'cv_download',
  'linkedin_click',
  'email_click',
  'explore_work',
  'contact_cta',
] as const;

export type AnalyticsEvent = (typeof analyticsEvents)[number];

export function isAnalyticsEvent(value: string): value is AnalyticsEvent {
  return (analyticsEvents as readonly string[]).includes(value);
}

/** Never forward arbitrary query strings or fragments to an optional recorder. */
export function isSafeAnalyticsLocation(
  href: string,
  referrer: string,
): boolean {
  const safeFragments = [
    '',
    '#home',
    '#main-content',
    '#highlights',
    '#expertise',
    '#projects',
    '#experience',
    '#about',
    '#contact',
  ];
  try {
    const url = new URL(href);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      !safeFragments.includes(url.hash)
    )
      return false;
    if (referrer) {
      const previous = new URL(referrer);
      if (
        !['http:', 'https:'].includes(previous.protocol) ||
        previous.username ||
        previous.password ||
        previous.search ||
        previous.hash
      )
        return false;
    }
    return true;
  } catch {
    return false;
  }
}
