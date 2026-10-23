import { describe, expect, it } from 'vitest';
import { resolveAnalytics } from '../../src/config/analytics';
import {
  analyticsEvents,
  CONSENT_MAX_AGE,
  isAnalyticsEvent,
  isSafeAnalyticsLocation,
  makeConsent,
  parseConsent,
} from '../../src/lib/analytics';

describe('optional analytics build configuration', () => {
  it.each([
    {},
    { CLARITY_ENABLED: 'false', CLARITY_PROJECT_ID: 'folio1234' },
    { CLARITY_ENABLED: 'true' },
    { CLARITY_ENABLED: 'true', CLARITY_PROJECT_ID: '' },
    { CLARITY_ENABLED: 'true', CLARITY_PROJECT_ID: 'x' },
    { CLARITY_ENABLED: 'true', CLARITY_PROJECT_ID: 'x'.repeat(21) },
    { CLARITY_ENABLED: 'true', CLARITY_PROJECT_ID: '../unsafe' },
    { CLARITY_ENABLED: 'true', CLARITY_PROJECT_ID: 'id?email=x' },
  ])('fails closed when configuration is incomplete or unsafe: %j', (env) => {
    expect(resolveAnalytics(env)).toEqual({ enabled: false, projectId: '' });
  });
  it('requires explicit opt-in and a valid public project identifier', () => {
    expect(
      resolveAnalytics({
        CLARITY_ENABLED: 'true',
        CLARITY_PROJECT_ID: ' folio1234 ',
      }),
    ).toEqual({ enabled: true, projectId: 'folio1234' });
  });
});

describe('project-specific expiring consent', () => {
  const now = 1_800_000_000_000;
  const project = 'folio1234';
  const encode = (value: unknown) => JSON.stringify(value);
  it('retains explicit acceptance and rejection without conflating missing consent', () => {
    for (const choice of ['accepted', 'rejected'] as const) {
      const record = makeConsent(choice, project, now);
      expect(parseConsent(encode(record), project, now)).toEqual(record);
    }
    expect(parseConsent(null, project, now)).toBeNull();
  });
  it('expires at the exact retention boundary and rejects future timestamps', () => {
    expect(
      parseConsent(
        encode(makeConsent('accepted', project, now - CONSENT_MAX_AGE + 1)),
        project,
        now,
      ),
    ).not.toBeNull();
    expect(
      parseConsent(
        encode(makeConsent('accepted', project, now - CONSENT_MAX_AGE)),
        project,
        now,
      ),
    ).toBeNull();
    expect(
      parseConsent(
        encode(makeConsent('accepted', project, now + 1)),
        project,
        now,
      ),
    ).toBeNull();
  });
  it.each([
    'invalid',
    'null',
    '[]',
    '{}',
    encode({ ...makeConsent('accepted', project, now), version: 0 }),
    encode({ ...makeConsent('accepted', project, now), choice: 'yes' }),
    encode({ ...makeConsent('accepted', project, now), projectId: 'other123' }),
    encode({ ...makeConsent('accepted', project, now), updatedAt: 'now' }),
  ])(
    'does not treat invalid or unrelated records as permission: %j',
    (value) => {
      expect(parseConsent(value, project, now)).toBeNull();
    },
  );
});

describe('analytics data minimization', () => {
  it('allows only fixed product action names', () => {
    expect(analyticsEvents).toEqual([
      'cv_view',
      'cv_download',
      'linkedin_click',
      'email_click',
      'explore_work',
      'contact_cta',
    ]);
    for (const event of analyticsEvents)
      expect(isAnalyticsEvent(event)).toBe(true);
    for (const value of [
      '',
      'email:person@example.com',
      'cv_view?name=person',
      'page_path',
      'click',
    ])
      expect(isAnalyticsEvent(value)).toBe(false);
  });
  it.each([
    ['https://folio.test/folio/', ''],
    ['https://folio.test/folio/#projects', 'https://www.linkedin.com/'],
    ['https://folio.test/folio/privacy/', ''],
  ])(
    'permits static navigation without variable URL data',
    (href, referrer) => {
      expect(isSafeAnalyticsLocation(href, referrer)).toBe(true);
    },
  );
  it.each([
    ['https://folio.test/folio/?email=private', ''],
    ['https://folio.test/folio/#private-person', ''],
    ['https://folio.test/folio/', 'https://external.test/?token=private'],
    ['https://folio.test/folio/', 'https://external.test/#private'],
    ['invalid', ''],
    ['https://folio.test/', 'invalid'],
  ])(
    'pauses recording when URL or referrer could contain private data',
    (href, referrer) => {
      expect(isSafeAnalyticsLocation(href, referrer)).toBe(false);
    },
  );
});
