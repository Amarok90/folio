import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { join } from 'node:path';

const navigation = [
  ['Overview', 'overview'],
  ['Design system', 'design-system'],
  ['Components', 'components'],
  ['Content', 'content'],
  ['Readiness', 'readiness'],
] as const;

async function openPreview(page: Page) {
  const response = await page.goto('./');
  expect(response?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}

test('preview has meaningful landmarks, navigation, and honest indexing metadata', async ({
  page,
}) => {
  await openPreview(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('banner')).toHaveCount(1);
  await expect(page.getByRole('main')).toHaveAttribute('id', 'main-content');
  await expect(page.getByRole('contentinfo')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/,
  );
  await expect(page.getByText(/foundation preview/i).first()).toBeVisible();

  const headingLevels = await page
    .getByRole('heading')
    .evaluateAll((headings) =>
      headings.map((heading) => Number(heading.tagName.slice(1))),
    );
  expect(headingLevels[0]).toBe(1);
  for (let index = 1; index < headingLevels.length; index += 1) {
    expect(
      headingLevels[index]! - headingLevels[index - 1]!,
    ).toBeLessThanOrEqual(1);
  }

  const nav = page.getByRole('navigation', {
    name: 'Main navigation',
    exact: true,
  });
  for (const [label, id] of navigation) {
    await expect(
      nav.getByRole('link', { name: label, exact: true }),
    ).toHaveAttribute('href', new RegExp(`#${id}$`));
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
});

for (const width of [320, 375, 390, 600, 768, 900, 1024, 1280, 1440, 1920]) {
  test(`layout remains usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openPreview(page);

    const measurements = await page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth;
      const clipped = [
        ...document.querySelectorAll('h1, h2, h3, h4, h5, h6, button, nav a'),
      ]
        .filter(
          (element): element is HTMLElement => element instanceof HTMLElement,
        )
        .filter((element) => element.getClientRects().length > 0)
        .filter((element) => {
          const bounds = element.getBoundingClientRect();
          const outsideViewport =
            bounds.left < -1 || bounds.right > viewportWidth + 1;
          const textClipped =
            element.clientWidth > 0 &&
            element.scrollWidth > element.clientWidth + 1;
          return outsideViewport || textClipped;
        })
        .map((element) => element.textContent?.trim());
      return {
        viewportWidth,
        documentWidth: document.documentElement.scrollWidth,
        clipped,
      };
    });

    expect(measurements.documentWidth).toBeLessThanOrEqual(
      measurements.viewportWidth + 1,
    );
    expect(measurements.clipped).toEqual([]);
    const primaryHeading = page.getByRole('heading', { level: 1 });
    await expect(primaryHeading).toBeVisible();
    const headingBounds = await primaryHeading.boundingBox();
    expect(headingBounds?.x).toBeGreaterThanOrEqual(16);

    const evidenceDirectory = process.env['FOLIO_SCREENSHOT_DIR'];
    if (evidenceDirectory && (width === 390 || width === 1440)) {
      await page.screenshot({
        path: join(evidenceDirectory, `foundation-${width}.png`),
        fullPage: true,
        animations: 'disabled',
      });
      await page.screenshot({
        path: join(evidenceDirectory, `foundation-${width}-viewport.png`),
        animations: 'disabled',
      });
    }

    if (width < 900) {
      const toggle = page.getByRole('button', {
        name: 'Open menu',
        exact: true,
      });
      await expect(toggle).toBeVisible();
      const bounds = await toggle.boundingBox();
      expect(bounds?.width).toBeGreaterThanOrEqual(44);
      expect(bounds?.height).toBeGreaterThanOrEqual(44);
    } else {
      await expect(
        page.getByRole('navigation', { name: 'Main navigation', exact: true }),
      ).toBeVisible();
    }
  });
}

for (const width of [390, 1440]) {
  test(`WCAG 2.2 AA automated checks at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openPreview(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
    if (width < 900) {
      await page
        .getByRole('button', { name: 'Open menu', exact: true })
        .click();
      const expandedResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(expandedResults.violations).toEqual([]);
    }
  });
}

test('mobile disclosure supports keyboard, Escape, and anchored navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPreview(page);
  const nav = page.getByRole('navigation', {
    name: 'Main navigation',
    exact: true,
  });
  const toggle = page.getByRole('button', { name: 'Open menu', exact: true });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(nav).toBeHidden();

  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(nav).toBeVisible();
  const closeToggle = page.getByRole('button', {
    name: 'Close menu',
    exact: true,
  });
  await expect(closeToggle).toHaveAttribute('aria-expanded', 'true');

  const firstLink = nav.getByRole('link', { name: 'Overview', exact: true });
  await page.keyboard.press('Tab');
  await expect(firstLink).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(nav).toBeHidden();
  await expect(toggle).toBeFocused();

  await page.keyboard.press('Space');
  await expect(nav).toBeVisible();
  await nav.getByRole('link', { name: 'Components', exact: true }).click();
  await expect(page).toHaveURL(/#components$/);
  await expect(nav).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('skip link is the first keyboard stop and moves focus into the main content', async ({
  page,
}) => {
  await openPreview(page);
  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', {
    name: 'Skip to content',
    exact: true,
  });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main-content$/);
  await expect(page.getByRole('main')).toBeFocused();
});

test('reduced motion disables smooth scrolling and substantial animations', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openPreview(page);
  const motion = await page.evaluate(() => {
    const timedElements = [...document.querySelectorAll('*')].filter(
      (element) => {
        const style = getComputedStyle(element);
        const seconds = (value: string) =>
          value.split(',').map((part) => Number.parseFloat(part));
        return (
          seconds(style.animationDuration).some(
            (duration) => duration > 0.01,
          ) ||
          seconds(style.transitionDuration).some((duration) => duration > 0.01)
        );
      },
    );
    return {
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
      timedElementCount: timedElements.length,
    };
  });
  expect(motion.scrollBehavior).toBe('auto');
  expect(motion.timedElementCount).toBe(0);
});

test('navigation remains usable without JavaScript', async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 375, height: 812 },
    baseURL: testInfo.project.use.baseURL as string,
  });
  try {
    const page = await context.newPage();
    await page.goto('./');
    const nav = page.getByRole('navigation', {
      name: 'Main navigation',
      exact: true,
    });
    await expect(nav).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Open menu', exact: true }),
    ).toBeHidden();
    await nav.getByRole('link', { name: 'Readiness', exact: true }).click();
    await expect(page).toHaveURL(/#readiness$/);
    await expect(page.locator('#readiness')).toBeInViewport();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  } finally {
    await context.close();
  }
});

test('production preview loads without failed assets or browser errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) =>
    errors.push(`${request.failure()?.errorText} ${request.url()}`),
  );
  await openPreview(page);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test('404 footer navigation returns to the home overview with the deployment base', async ({
  page,
}, testInfo) => {
  const homeOverview = new URL(
    './#overview',
    testInfo.project.use.baseURL as string,
  );
  for (const name of ['FOLIO', 'Back to top']) {
    await page.goto('./404.html');
    const footer = page.getByRole('contentinfo');
    const link = footer.getByRole('link', { name, exact: true });
    await expect(link).toHaveAttribute(
      'href',
      `${homeOverview.pathname}${homeOverview.hash}`,
    );
    await link.click();
    await expect(page).toHaveURL(homeOverview.href);
    await expect(page.locator('#overview')).toBeInViewport();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  }
});
