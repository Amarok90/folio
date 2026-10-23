import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const scriptURL = 'https://www.clarity.ms/tag/folio1234';
const storageKey = 'folio.consent.v1';
const mockScript = `
  window.__clarityCalls = (window.clarity?.q || []).map(call => Array.from(call));
  window.clarity = (...args) => window.__clarityCalls.push(args);
`;

type RecordedWindow = Window & { __clarityCalls?: unknown[][] };
const calls = (page: Page) =>
  page.evaluate(() => (window as RecordedWindow).__clarityCalls ?? []);
const root = (page: Page) => page.locator('[data-consent-root]');
const banner = (page: Page) => page.locator('#consent-banner');
const preferences = (page: Page) => page.locator('#consent-preferences');

async function open(page: Page, path = './') {
  await page.goto(path);
  await expect(root(page)).toHaveAttribute('data-initialized', 'true');
  await expect(root(page)).toHaveAttribute('data-enabled', 'true');
}
async function openPreferences(page: Page) {
  await page.locator('[data-consent-open]:visible').last().click();
  await expect(preferences(page)).toBeVisible();
}
async function accept(page: Page) {
  await banner(page)
    .getByRole('button', { name: 'Accept analytics', exact: true })
    .click();
  await expect(page.locator('#folio-clarity-script')).toHaveAttribute(
    'data-status',
    'loaded',
  );
}
async function preventExternalNavigation(page: Page) {
  await page.evaluate(() => {
    document.addEventListener(
      'click',
      (event) => {
        if (event.target instanceof Element && event.target.closest('a'))
          event.preventDefault();
      },
      { capture: true },
    );
  });
}

test.beforeEach(async ({ page }) => {
  // No test sends data to Clarity. This mock verifies our integration contract,
  // not Microsoft's production ingestion, recordings or heatmaps.
  await page.route(scriptURL, (route) =>
    route.fulfill({ contentType: 'application/javascript', body: mockScript }),
  );
});

test('first visit and explicit rejection never load optional analytics', async ({
  page,
}) => {
  let requests = 0;
  page.on('request', (request) => {
    if (request.url() === scriptURL) requests += 1;
  });
  await open(page);
  await expect(banner(page)).toBeVisible();
  await expect(page.locator('#folio-clarity-script')).toHaveCount(0);
  await page.locator('[data-analytics-event="explore_work"]').first().click();
  await expect(page).toHaveURL(/#projects$/);
  expect(requests).toBe(0);
  expect(await calls(page)).toEqual([]);
  await banner(page)
    .getByRole('button', { name: 'Reject analytics', exact: true })
    .click();
  await expect(banner(page)).toBeHidden();
  expect(
    JSON.parse(
      (await page.evaluate((key) => localStorage.getItem(key), storageKey)) ??
        '{}',
    ).choice,
  ).toBe('rejected');
  await page.reload();
  await expect(root(page)).toHaveAttribute('data-choice', 'rejected');
  expect(requests).toBe(0);
  await expect(page.locator('#folio-clarity-script')).toHaveCount(0);
});

test('acceptance signals analytics consent while advertising remains denied', async ({
  page,
}) => {
  await open(page);
  await accept(page);
  await expect(banner(page)).toBeHidden();
  expect(await calls(page)).toEqual([
    ['consentv2', { analytics_Storage: 'granted', ad_Storage: 'denied' }],
  ]);
  await openPreferences(page);
  await preferences(page)
    .getByRole('button', { name: 'Accept analytics', exact: true })
    .click();
  await expect(page.locator('#folio-clarity-script')).toHaveCount(1);
  expect(await calls(page)).toHaveLength(1);
});

test('eligible real actions emit one allowlisted event each with no personal payload', async ({
  page,
}) => {
  await open(page);
  await accept(page);
  await preventExternalNavigation(page);
  const expected = [
    'cv_view',
    'linkedin_click',
    'email_click',
    'explore_work',
    'contact_cta',
  ];
  for (const name of expected) {
    const link = page.locator(`[data-analytics-event="${name}"]`).first();
    await expect(link).toBeVisible();
    await link.click();
  }
  const recorded = await calls(page);
  const events = recorded.filter((call) => call[0] === 'event');
  expect(events).toEqual(expected.map((name) => ['event', name]));
  for (const event of events) expect(event).toHaveLength(2);
  expect(JSON.stringify(recorded)).not.toMatch(
    /konstantin|arutjunov|gmail|mailto|linkedin\.com|https?:/i,
  );
});

test('nested SVG activation is tracked once and unknown event values are ignored', async ({
  page,
}) => {
  await open(page);
  await accept(page);
  await preventExternalNavigation(page);
  const linkedIn = page
    .locator('[data-analytics-event="linkedin_click"]')
    .last();
  await linkedIn.locator('svg').click();
  expect((await calls(page)).filter((call) => call[0] === 'event')).toEqual([
    ['event', 'linkedin_click'],
  ]);
  await linkedIn.evaluate((element) =>
    element.setAttribute('data-analytics-event', 'person@example.com'),
  );
  await page.locator('[data-analytics-event="person@example.com"]').click();
  expect(
    (await calls(page)).filter((call) => call[0] === 'event'),
  ).toHaveLength(1);
});

test('CV download uses the same static event contract without sending filename or URL', async ({
  page,
}) => {
  await open(page);
  await accept(page);
  await preventExternalNavigation(page);
  // The real local PDF is absent. Exercise the shared delegated download hook
  // with an isolated DOM fixture; the CMS suite verifies actual PDF rendering.
  await page.evaluate(() => {
    const fixture = document.createElement('a');
    fixture.href = '/folio/documents/test.pdf';
    fixture.download = 'test.pdf';
    fixture.dataset['analyticsEvent'] = 'cv_download';
    fixture.textContent = 'Download integration fixture';
    document.body.append(fixture);
  });
  await page
    .getByRole('link', { name: 'Download integration fixture' })
    .click();
  expect((await calls(page)).filter((call) => call[0] === 'event')).toEqual([
    ['event', 'cv_download'],
  ]);
});

test('withdrawal resets the active recorder, clears its cookies and persists rejection', async ({
  page,
  context,
}) => {
  let requests = 0;
  page.on('request', (request) => {
    if (request.url() === scriptURL) requests += 1;
  });
  await open(page);
  await accept(page);
  await context.addCookies([
    { name: '_clck', value: 'test', url: 'http://127.0.0.1:4323/' },
    { name: '_clsk', value: 'test', url: 'http://127.0.0.1:4323/folio/' },
    { name: 'unrelated', value: 'retained', url: 'http://127.0.0.1:4323/' },
  ]);
  await openPreferences(page);
  await Promise.all([
    page.waitForEvent('framenavigated', (frame) => frame === page.mainFrame()),
    preferences(page)
      .getByRole('button', { name: 'Reject analytics', exact: true })
      .click(),
  ]);
  await expect(root(page)).toHaveAttribute('data-choice', 'rejected');
  await expect(page.locator('#folio-clarity-script')).toHaveCount(0);
  const cookies = await context.cookies();
  expect(
    cookies.some((cookie) => ['_clck', '_clsk'].includes(cookie.name)),
  ).toBe(false);
  expect(cookies.some((cookie) => cookie.name === 'unrelated')).toBe(true);
  expect(requests).toBe(1);
  await page.locator('[data-analytics-event="explore_work"]').first().click();
  await expect(page).toHaveURL(/#projects$/);
  expect(await calls(page)).toEqual([]);
});

test('preferences permit changing rejection to acceptance and restore keyboard focus', async ({
  page,
}) => {
  await open(page);
  await banner(page)
    .getByRole('button', { name: 'Reject analytics', exact: true })
    .click();
  const opener = page.locator('[data-consent-open]:visible').last();
  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(preferences(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(preferences(page)).toBeHidden();
  await expect(opener).toBeFocused();
  await openPreferences(page);
  await preferences(page)
    .getByRole('button', { name: 'Accept analytics', exact: true })
    .click();
  await expect(root(page)).toHaveAttribute('data-choice', 'accepted');
  await expect(page.locator('#folio-clarity-script')).toHaveAttribute(
    'data-status',
    'loaded',
  );
});

test('blocked Clarity scripts and throwing analytics cannot break core actions', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(scriptURL, (route) => route.abort('blockedbyclient'));
  await open(page);
  await banner(page)
    .getByRole('button', { name: 'Accept analytics', exact: true })
    .click();
  await expect(page.locator('#folio-clarity-script')).toHaveAttribute(
    'data-status',
    'failed',
  );
  await page.locator('[data-analytics-event="explore_work"]').first().click();
  await expect(page).toHaveURL(/#projects$/);
  await preventExternalNavigation(page);
  await page.locator('[data-analytics-event="cv_view"]').first().click();
  await page.locator('[data-analytics-event="email_click"]').first().click();
  expect(await calls(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test('a loaded analytics function throwing does not cancel navigation or contact links', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(scriptURL, (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: 'window.clarity = () => { throw new Error("Optional analytics failed"); };',
    }),
  );
  await open(page);
  await accept(page);
  await page.locator('[data-analytics-event="explore_work"]').first().click();
  await expect(page).toHaveURL(/#projects$/);
  await expect(
    page
      .locator('#contact a[href="mailto:konstantin.arutjunov@gmail.com"]')
      .first(),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('events are not queued while the optional script is still loading', async ({
  page,
}) => {
  let release: (() => void) | undefined;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(scriptURL, async (route) => {
    await delayed;
    await route.fulfill({
      contentType: 'application/javascript',
      body: mockScript,
    });
  });
  await open(page);
  await banner(page)
    .getByRole('button', { name: 'Accept analytics', exact: true })
    .click();
  await expect(page.locator('#folio-clarity-script')).toHaveAttribute(
    'data-status',
    'loading',
  );
  await page.locator('[data-analytics-event="explore_work"]').first().click();
  await expect(page).toHaveURL(/#projects$/);
  release?.();
  await expect(page.locator('#folio-clarity-script')).toHaveAttribute(
    'data-status',
    'loaded',
  );
  expect((await calls(page)).filter((call) => call[0] === 'event')).toEqual([]);
});

for (const suffix of ['?email=private-test', '#private-test']) {
  test(`URL privacy guard prevents script loading for ${suffix}`, async ({
    page,
  }) => {
    await open(page, `./${suffix}`);
    await banner(page)
      .getByRole('button', { name: 'Accept analytics', exact: true })
      .click();
    await expect(root(page)).toHaveAttribute('data-choice', 'accepted');
    await expect(page.locator('#folio-clarity-script')).toHaveCount(0);
    await openPreferences(page);
    await expect(page.locator('#consent-status')).toHaveText(
      /paused.*URL privacy/,
    );
    expect(await calls(page)).toEqual([]);
  });
}

test('unavailable browser storage defaults to no tracking and supports session-only withdrawal', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'getItem', {
      value: () => {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });
    Object.defineProperty(Storage.prototype, 'setItem', {
      value: () => {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });
    Object.defineProperty(Storage.prototype, 'removeItem', {
      value: () => {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });
  });
  await open(page);
  await expect(banner(page)).toBeVisible();
  await expect(page.locator('#folio-clarity-script')).toHaveCount(0);
  await accept(page);
  await openPreferences(page);
  await Promise.all([
    page.waitForEvent('framenavigated', (frame) => frame === page.mainFrame()),
    preferences(page)
      .getByRole('button', { name: 'Reject analytics', exact: true })
      .click(),
  ]);
  await expect(root(page)).toHaveAttribute('data-choice', 'rejected');
  await expect(page.locator('#folio-clarity-script')).toHaveCount(0);
});

test('transient storage failure during withdrawal cannot revive a previously saved grant after reload', async ({
  page,
}) => {
  let requests = 0;
  page.on('request', (request) => {
    if (request.url() === scriptURL) requests += 1;
  });
  await open(page);
  await accept(page);
  await page.evaluate(() => {
    Object.defineProperty(Storage.prototype, 'setItem', {
      value: () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      },
    });
    Object.defineProperty(Storage.prototype, 'removeItem', {
      value: () => {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });
  });
  await openPreferences(page);
  await Promise.all([
    page.waitForEvent('framenavigated', (frame) => frame === page.mainFrame()),
    preferences(page)
      .getByRole('button', { name: 'Reject analytics', exact: true })
      .click(),
  ]);
  await expect(root(page)).toHaveAttribute('data-choice', 'rejected');
  await expect(page.locator('#folio-clarity-script')).toHaveCount(0);
  await expect(page).not.toHaveURL(/privacy-reset/);
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}'),
    storageKey,
  );
  expect(saved.choice).toBe('rejected');
  expect(requests).toBe(1);
});

test('revocation in another tab stops an active recorder in the original tab', async ({
  page,
  context,
}) => {
  let requests = 0;
  page.on('request', (request) => {
    if (request.url() === scriptURL) requests += 1;
  });
  await open(page);
  await accept(page);
  const other = await context.newPage();
  try {
    await other.route(scriptURL, (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: mockScript,
      }),
    );
    await other.goto('./privacy/');
    await Promise.all([
      page.waitForEvent(
        'framenavigated',
        (frame) => frame === page.mainFrame(),
      ),
      other.evaluate(
        (key) =>
          localStorage.setItem(
            key,
            JSON.stringify({
              version: 1,
              choice: 'rejected',
              updatedAt: Date.now(),
              projectId: 'folio1234',
            }),
          ),
        storageKey,
      ),
    ]);
    await expect(root(page)).toHaveAttribute('data-choice', 'rejected');
    await expect(page.locator('#folio-clarity-script')).toHaveCount(0);
    expect(requests).toBe(1);
  } finally {
    await other.close();
  }
});

for (const width of [320, 390, 768, 1440]) {
  test(`consent banner and preferences are accessible and fit at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    for (const name of ['Accept analytics', 'Reject analytics']) {
      const button = banner(page).getByRole('button', { name, exact: true });
      const bounds = await button.boundingBox();
      expect(bounds?.width).toBeGreaterThanOrEqual(44);
      expect(bounds?.height).toBeGreaterThanOrEqual(44);
      expect(bounds?.x).toBeGreaterThanOrEqual(0);
      expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(
        width,
      );
    }
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
    await openPreferences(page);
    const dialogBounds = await preferences(page).boundingBox();
    expect(dialogBounds).not.toBeNull();
    expect(
      Math.abs(
        (dialogBounds?.x ?? 0) + (dialogBounds?.width ?? 0) / 2 - width / 2,
      ),
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs(
        (dialogBounds?.y ?? 0) + (dialogBounds?.height ?? 0) / 2 - 900 / 2,
      ),
    ).toBeLessThanOrEqual(2);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
  });
}
