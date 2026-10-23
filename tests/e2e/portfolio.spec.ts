import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { join } from 'node:path';

const navigation = [
  ['About', 'about'],
  ['Expertise', 'expertise'],
  ['Projects', 'projects'],
  ['Experience', 'experience'],
  ['Contact', 'contact'],
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
  await expect(
    page.getByText('Design preview', { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText(/content verification pending/i).first(),
  ).toBeVisible();
  for (const id of ['home', 'highlights', ...navigation.map(([, id]) => id)]) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }

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

for (const width of [
  320, 375, 390, 480, 600, 768, 900, 1024, 1180, 1280, 1440, 1920,
]) {
  test(`layout remains usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openPreview(page);

    const measurements = await page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth;
      const clipped = [
        ...document.querySelectorAll(
          'h1, h2, h3, h4, h5, h6, button, summary, nav a',
        ),
      ]
        .filter(
          (element): element is HTMLElement => element instanceof HTMLElement,
        )
        .filter((element) => element.getClientRects().length > 0)
        .filter((element) => {
          const style = getComputedStyle(element);
          // Visually hidden accessible labels deliberately use a 1px clipped box.
          return (
            style.getPropertyValue('clip') !== 'rect(0px, 0px, 0px, 0px)' &&
            style.clipPath !== 'inset(50%)'
          );
        })
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
    if (
      evidenceDirectory &&
      [320, 390, 768, 1024, 1440, 1920].includes(width)
    ) {
      // Full-page screenshots do not trigger the browser's lazy-loading viewport.
      // Visit each image as a reader would, then return to the initial composition.
      for (const image of await page.locator('main img').all()) {
        await image.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            image.evaluate(
              (element: HTMLImageElement) =>
                element.complete && element.naturalWidth > 0,
            ),
          )
          .toBe(true);
      }
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: 'instant' }),
      );
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      await page.screenshot({
        path: join(evidenceDirectory, `folio-${width}.png`),
        fullPage: true,
        animations: 'disabled',
      });
      await page.screenshot({
        path: join(evidenceDirectory, `folio-${width}-viewport.png`),
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

  const firstLink = nav.getByRole('link', { name: 'About', exact: true });
  await page.keyboard.press('Tab');
  await expect(firstLink).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(nav).toBeHidden();
  await expect(toggle).toBeFocused();

  await page.keyboard.press('Space');
  await expect(nav).toBeVisible();
  await nav.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(page).toHaveURL(/#projects$/);
  await expect(nav).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('active navigation clears when returning from Experience to the hero', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openPreview(page);
  const navigation = page.getByRole('navigation', {
    name: 'Main navigation',
    exact: true,
  });
  const projects = navigation.getByRole('link', {
    name: 'Projects',
    exact: true,
  });
  await projects.click();
  await expect(projects).toHaveAttribute('aria-current', 'location');
  const experience = navigation.getByRole('link', {
    name: 'Experience',
    exact: true,
  });
  await experience.click();
  await expect(experience).toHaveAttribute('aria-current', 'location');
  await page
    .getByRole('banner')
    .getByRole('link', { name: 'FOLIO home', exact: true })
    .click();
  await expect(page).toHaveURL(/#home$/);
  await expect(page.locator('#home')).toBeInViewport();
  await expect(navigation.locator('[aria-current]')).toHaveCount(0);
});

test('expertise tabs switch distinct content and implement keyboard navigation', async ({
  page,
}) => {
  await openPreview(page);
  const expertise = page.locator('#expertise');
  const tablist = expertise.getByRole('tablist');
  await expect(tablist).toHaveCount(1);
  const tabs = tablist.getByRole('tab');
  await expect(tabs).toHaveCount(4);
  const content = new Set<string>();
  for (let index = 0; index < (await tabs.count()); index += 1) {
    const tab = tabs.nth(index);
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(tab).toHaveAttribute('tabindex', '0');
    const panelId = await tab.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    const panel = expertise.locator(`[id="${panelId}"]`);
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('role', 'tabpanel');
    const panelText = (await panel.innerText()).trim();
    expect(panelText.length).toBeGreaterThan(30);
    content.add(panelText);
    await expect(expertise.getByRole('tabpanel')).toHaveCount(1);
    for (let other = 0; other < (await tabs.count()); other += 1) {
      if (other !== index) {
        await expect(tabs.nth(other)).toHaveAttribute('aria-selected', 'false');
        await expect(tabs.nth(other)).toHaveAttribute('tabindex', '-1');
      }
    }
  }
  expect(content.size).toBe(4);
  await tabs.first().click();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End');
  await expect(tabs.last()).toBeFocused();
  await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(tabs.first()).toBeFocused();
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(tabs.last()).toBeFocused();
});

test('case studies disclose real challenges, contributions and limitations with native keyboard controls', async ({
  page,
}) => {
  await openPreview(page);
  const projects = page.locator('#projects');
  const disclosures = projects.locator('details');
  await expect(disclosures).toHaveCount(3);
  for (const disclosure of await disclosures.all()) {
    const summary = disclosure.locator('summary');
    await expect(disclosure).not.toHaveAttribute('open');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(disclosure).toHaveAttribute('open', '');
    expect((await disclosure.innerText()).trim().length).toBeGreaterThan(100);
    for (const name of [
      'The challenge',
      'My contribution',
      'Context & limitations',
    ]) {
      await expect(
        disclosure.getByRole('heading', { name, exact: true }),
      ).toBeVisible();
    }
    await page.keyboard.press('Enter');
    await expect(disclosure).not.toHaveAttribute('open');
  }
});

test('expanded portfolio interactions retain WCAG 2.2 AA semantics and contrast', async ({
  page,
}) => {
  await openPreview(page);
  const tabs = page.locator('#expertise').getByRole('tab');
  for (const tab of await tabs.all()) {
    await tab.click();
    const results = await new AxeBuilder({ page })
      .include('#expertise')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  }
  await page.locator('#projects details').first().locator('summary').click();
  for (const summary of await page.locator('#contact details summary').all()) {
    await summary.click();
  }
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('CV, translation and contact controls use their real available destinations', async ({
  page,
}) => {
  await openPreview(page);
  const previewCV = page.getByRole('link', { name: /^View CV/ });
  expect(await previewCV.count()).toBeGreaterThanOrEqual(2);
  for (const link of await previewCV.all()) {
    await expect(link).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/konstantin-arutjunov/overlay/1753005451683/single-media-viewer/',
    );
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
  }
  await expect(
    page.getByRole('button', { name: 'CV pending', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('a[download]')).toHaveCount(0);
  const email = page.locator(
    '#contact a[href="mailto:konstantin.arutjunov@gmail.com"]',
  );
  expect(await email.count()).toBeGreaterThanOrEqual(1);
  await expect(email.first()).toBeVisible();
  await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
  const languageControl = page.getByLabel(/^Language:.*English/);
  await expect(languageControl).toHaveJSProperty('tagName', 'SUMMARY');
  const language = page.locator('details').filter({ has: languageControl });
  await languageControl.focus();
  await page.keyboard.press('Enter');
  await expect(language).toHaveAttribute('open', '');
  await expect(
    language.getByText('Other translations are not available yet.', {
      exact: true,
    }),
  ).toBeVisible();
  await language.locator('summary').click();
});

test('responsive images reserve space and load locally without broken sources', async ({
  page,
}) => {
  await openPreview(page);
  const images = page.locator('main img');
  expect(await images.count()).toBeGreaterThanOrEqual(3);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveAttribute('alt');
    expect(Number(await image.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(await image.getAttribute('height'))).toBeGreaterThan(0);
    await expect
      .poll(() =>
        image.evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
    const source = await image.evaluate(
      (element: HTMLImageElement) => element.currentSrc,
    );
    expect(new URL(source).origin).toBe(new URL(page.url()).origin);
    expect(source).not.toMatch(/folio\.png|Desktop/);
  }
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
    await nav.getByRole('link', { name: 'Contact', exact: true }).click();
    await expect(page).toHaveURL(/#contact$/);
    await expect(page.locator('#contact')).toBeInViewport();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    const expertisePanels = page.locator(
      '#expertise [role="tabpanel"], #expertise [data-expertise-panel]',
    );
    expect(await expertisePanels.count()).toBeGreaterThanOrEqual(4);
    for (const panel of await expertisePanels.all())
      await expect(panel).toBeVisible();
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

test('404 footer navigation returns home with the deployment base', async ({
  page,
}, testInfo) => {
  const homeOverview = new URL(
    './#home',
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
    await expect(page.locator('#home')).toBeInViewport();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  }
});
