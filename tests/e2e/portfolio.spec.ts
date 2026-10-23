import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { join } from 'node:path';
import profileInput from '../../src/data/profile.json' with { type: 'json' };
import expertiseInput from '../../src/content/expertise.json' with { type: 'json' };
import projectsInput from '../../src/content/case-studies.json' with { type: 'json' };
import skillsInput from '../../src/content/skills.json' with { type: 'json' };
import experienceInput from '../../src/content/experience.json' with { type: 'json' };
import educationInput from '../../src/content/education.json' with { type: 'json' };
import interfaceInput from '../../src/data/interface.json' with { type: 'json' };
import mediaInput from '../../src/data/media.json' with { type: 'json' };
import {
  caseStudySchema,
  expertiseSchema,
  profileSchema,
  skillSchema,
  interfaceSchema,
  mediaSchema,
  experienceSchema,
  educationSchema,
} from '../../src/lib/content';

const profileSource = profileSchema.parse(profileInput);
const expertiseSource = expertiseSchema.array().parse(expertiseInput);
const projectsSource = caseStudySchema.array().parse(projectsInput);
const skillsSource = skillSchema.array().parse(skillsInput);
const ui = interfaceSchema.parse(interfaceInput);
const mediaSource = mediaSchema.parse(mediaInput);
const experienceSource = experienceSchema.array().parse(experienceInput);
const educationSource = educationSchema.array().parse(educationInput);

const published = (record: { status: string; visible: boolean }) =>
  record.status === 'published' && record.visible;
const categoryCount = expertiseSource.filter(published).length;
const projectCount = projectsSource.filter(published).length;
const publicProjects = projectsSource
  .filter(published)
  .sort(
    (left, right) =>
      left.order - right.order ||
      (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
  );
const byEditorialOrder = (
  left: { order: number; id: string },
  right: { order: number; id: string },
) =>
  left.order - right.order ||
  (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
const publicTimeline = [
  ...experienceSource
    .filter(published)
    .sort(byEditorialOrder)
    .map((entry) => ({
      ...entry,
      id: `experience-${entry.id}`,
      title: entry.role,
      kind: 'experience' as const,
    })),
  ...educationSource
    .filter(published)
    .sort(byEditorialOrder)
    .map((entry) => ({
      ...entry,
      id: `education-${entry.id}`,
      title: entry.qualification,
      organization: entry.institution,
      summary: entry.field,
      achievements: [],
      kind: 'education' as const,
    })),
];
const indexable = process.env['SITE_INDEXABLE'] === 'true';
const analyticsEnabled =
  process.env['CLARITY_ENABLED'] === 'true' &&
  /^[a-z0-9]{6,20}$/i.test(process.env['CLARITY_PROJECT_ID']?.trim() ?? '');

const navigation = ui.navigation.map(
  ({ label, href }) => [label, href.slice(1)] as const,
);

async function openPreview(page: Page) {
  const response = await page.goto('./');
  expect(response?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  if (analyticsEnabled)
    await page
      .locator('#consent-banner')
      .getByRole('button', { name: 'Reject analytics', exact: true })
      .click();
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
    indexable ? 'index, follow' : 'noindex, nofollow',
  );
  await expect(
    page.getByRole('complementary', { name: 'Preview status' }),
  ).toHaveCount(indexable ? 0 : 1);
  if (mediaSource.portrait.temporary)
    await expect(page.locator('.portrait-note')).toHaveText(
      ui.common.portraitNote,
    );
  for (const id of [
    'home',
    'highlights',
    'expertise',
    'projects',
    'experience',
    'about',
    'contact',
  ]) {
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
    if (width >= 1024) {
      const composition = await page.evaluate(() => {
        const main = document
          .querySelector('.site-main')!
          .getBoundingClientRect();
        const expertise = document
          .querySelector('#expertise')!
          .getBoundingClientRect();
        const projects = document
          .querySelector('#projects')!
          .getBoundingClientRect();
        const skills = document
          .querySelector('#expertise .expertise-content')!
          .getBoundingClientRect();
        const analytics = document
          .querySelector('#expertise .expertise-visual')
          ?.getBoundingClientRect();
        const portrait = document
          .querySelector('#about .about__portrait')!
          .getBoundingClientRect();
        const story = document
          .querySelector('#about .about__intro')!
          .getBoundingClientRect();
        return {
          width: main.width,
          horizontalBalance:
            main.left + main.right - document.documentElement.clientWidth,
          sectionGap: projects.top - expertise.bottom,
          expertise: analytics
            ? {
                leftShare: skills.width / (skills.width + analytics.width),
                gutter: analytics.left - skills.right,
              }
            : null,
          about: {
            gutter: story.left - portrait.right,
            rowOverlap:
              Math.min(portrait.bottom, story.bottom) -
              Math.max(portrait.top, story.top),
          },
        };
      });
      expect(composition.width).toBeLessThanOrEqual(1201);
      if (width >= 1440) expect(composition.width).toBeGreaterThanOrEqual(1199);
      expect(Math.abs(composition.horizontalBalance)).toBeLessThanOrEqual(2);
      expect(composition.sectionGap).toBeGreaterThanOrEqual(55);
      expect(composition.sectionGap).toBeLessThanOrEqual(105);
      if (mediaSource.analytics) {
        expect(composition.expertise).not.toBeNull();
        expect(composition.expertise?.leftShare).toBeGreaterThanOrEqual(0.62);
        expect(composition.expertise?.leftShare).toBeLessThanOrEqual(0.68);
        expect(composition.expertise?.gutter).toBeGreaterThanOrEqual(15);
      } else expect(composition.expertise).toBeNull();
      expect(composition.about.gutter).toBeGreaterThanOrEqual(15);
      expect(composition.about.rowOverlap).toBeGreaterThan(0);
    }
    if (width < 640) {
      const mobileAboutGap = await page.evaluate(() => {
        const portrait = document
          .querySelector('#about .about__portrait')!
          .getBoundingClientRect();
        const story = document
          .querySelector('#about .about__intro')!
          .getBoundingClientRect();
        return story.top - portrait.bottom;
      });
      expect(mobileAboutGap).toBeGreaterThanOrEqual(15);
    }
    if (width === 768 && mediaSource.analytics) {
      const tabletImageGap = await page.evaluate(() => {
        const content = document
          .querySelector('#expertise .expertise-content')!
          .getBoundingClientRect();
        const image = document
          .querySelector('#expertise .expertise-visual')!
          .getBoundingClientRect();
        return image.top - content.bottom;
      });
      expect(tabletImageGap).toBeGreaterThanOrEqual(15);
    }
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

  const firstLink = nav.getByRole('link', {
    name: navigation[0]![0],
    exact: true,
  });
  await page.keyboard.press('Tab');
  await expect(firstLink).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(nav).toBeHidden();
  await expect(toggle).toBeFocused();

  await page.keyboard.press('Space');
  await expect(nav).toBeVisible();
  const destination =
    ui.navigation.find((link) => link.href === '#projects') ??
    ui.navigation.at(-1)!;
  await nav.getByRole('link', { name: destination.label, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${destination.href}$`));
  await expect(nav).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('active navigation clears when returning from a configured section to the hero', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openPreview(page);
  const navigation = page.getByRole('navigation', {
    name: 'Main navigation',
    exact: true,
  });
  const observedLinks = navigation.locator(
    'a[href$="#projects"], a[href$="#experience"]',
  );
  for (const link of await observedLinks.all()) {
    await link.click();
    await expect(link).toHaveAttribute('aria-current', 'location');
  }
  await page.getByRole('banner').locator('a.brand').click();
  await expect(page).toHaveURL(/#home$/);
  await expect(page.locator('#home')).toBeInViewport();
  if (ui.navigation.some((link) => link.href === '#home'))
    await expect(navigation.locator('[aria-current]')).toHaveAttribute(
      'href',
      /#home$/,
    );
  else await expect(navigation.locator('[aria-current]')).toHaveCount(0);
});

test('expertise tabs switch distinct content and implement keyboard navigation', async ({
  page,
}) => {
  await openPreview(page);
  const expertise = page.locator('#expertise');
  const tablist = expertise.getByRole('tablist');
  if (categoryCount === 0) {
    await expect(tablist).toHaveCount(0);
    await expect(expertise).toContainText(ui.expertise.emptyMessage);
    return;
  }
  await expect(tablist).toHaveCount(1);
  const tabs = tablist.getByRole('tab');
  await expect(tabs).toHaveCount(categoryCount);
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
    const categoryId = panelId?.replace('expertise-panel-', '');
    const skills = skillsSource.filter(
      (skill) => published(skill) && skill.categoryId === categoryId,
    );
    await expect(panel.locator('.skill-row')).toHaveCount(skills.length);
    for (const skill of skills) {
      await expect(panel).toContainText(skill.name);
      const namePattern = new RegExp(
        skill.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      );
      const rating = panel.getByRole('meter', {
        name: namePattern,
      });
      if (skill.selfAssessment === null) {
        await expect(rating).toHaveCount(0);
      } else {
        await expect(rating).toHaveCount(1);
        await expect(rating).toHaveAttribute(
          'value',
          String(skill.selfAssessment),
        );
        await expect(rating).toHaveAttribute('min', '1');
        await expect(rating).toHaveAttribute('max', '100');
        await expect(rating).toHaveAccessibleName(namePattern);
        await expect(expertise).toContainText(/self-assessed/i);
      }
    }
    await expect(panel.getByRole('meter')).toHaveCount(
      skills.filter((skill) => skill.selfAssessment !== null).length,
    );
    if (skills.length === 0)
      await expect(panel).toContainText(ui.expertise.emptySkillsMessage);
    content.add(panelText);
    await expect(expertise.getByRole('tabpanel')).toHaveCount(1);
    for (let other = 0; other < (await tabs.count()); other += 1) {
      if (other !== index) {
        await expect(tabs.nth(other)).toHaveAttribute('aria-selected', 'false');
        await expect(tabs.nth(other)).toHaveAttribute('tabindex', '-1');
      }
    }
  }
  expect(content.size).toBe(categoryCount);
  await tabs.first().click();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(categoryCount === 1 ? 0 : 1)).toBeFocused();
  await expect(tabs.nth(categoryCount === 1 ? 0 : 1)).toHaveAttribute(
    'aria-selected',
    'true',
  );
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
  await expect(disclosures).toHaveCount(projectCount);
  for (const [index, disclosure] of (await disclosures.all()).entries()) {
    const summary = disclosure.locator('summary');
    await expect(disclosure).not.toHaveAttribute('open');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(disclosure).toHaveAttribute('open', '');
    const project = publicProjects[index]!;
    await expect(disclosure).toContainText(project.challenge);
    await expect(disclosure).toContainText(project.contribution);
    for (const name of [
      ui.projects.challengeHeading,
      ui.projects.contributionHeading,
    ]) {
      await expect(
        disclosure.getByRole('heading', { name, exact: true }),
      ).toBeVisible();
    }
    if (project.limitations.length > 0)
      await expect(
        disclosure.getByRole('heading', {
          name: ui.projects.limitationsHeading,
          exact: true,
        }),
      ).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(disclosure).not.toHaveAttribute('open');
  }
});

test('career and education preserve published facts, real dates and editorial ordering', async ({
  page,
}) => {
  await openPreview(page);
  const timeline = page.locator('#experience .career-timeline');
  if (publicTimeline.length === 0) {
    await expect(timeline).toHaveCount(0);
    await expect(page.locator('#experience')).toContainText(
      ui.journey.emptyMessage,
    );
    return;
  }
  await expect(timeline).toHaveRole('list');
  const steps = timeline.locator(':scope > .career-step');
  expect(
    await steps.evaluateAll((entries) => entries.map(({ id }) => id)),
  ).toEqual(publicTimeline.map(({ id }) => id));
  for (const entry of publicTimeline) {
    const step = timeline.locator(`[id="${entry.id}"]`);
    await expect(step.locator('h3')).toHaveText(entry.title);
    await expect(step.locator('.career-step__organization')).toContainText(
      entry.organization,
    );
    expect(
      await step
        .locator('time')
        .evaluateAll((dates) =>
          dates.map((date) => date.getAttribute('datetime')),
        ),
    ).toEqual(
      entry.endDate ? [entry.startDate, entry.endDate] : [entry.startDate],
    );
    if (!entry.endDate)
      await expect(step.locator('.career-step__date')).toContainText(
        entry.kind === 'education'
          ? ui.common.ongoingLabel
          : ui.journey.presentLabel,
      );
    const details = step.locator('details');
    const hasDisclosure = (await details.count()) > 0;
    if (hasDisclosure) {
      await expect(details).not.toHaveAttribute('open');
      await details.locator('summary').focus();
      await page.keyboard.press('Enter');
      await expect(details).toHaveAttribute('open', '');
    }
    if (entry.summary) {
      await expect(step.locator('.career-step__summary')).toHaveText(
        entry.summary,
      );
      await expect(step.locator('.career-step__summary')).toBeVisible();
    }
    for (const achievement of entry.achievements)
      await expect(step).toContainText(achievement);
    if (entry.kind === 'experience') {
      for (const id of entry.skillIds) {
        const skill = skillsSource.find(
          (skill) => skill.id === id && published(skill),
        );
        if (skill)
          await expect(
            step.getByText(skill.name, { exact: true }),
          ).toBeVisible();
      }
    }
    if (hasDisclosure) {
      await page.keyboard.press('Enter');
      await expect(details).not.toHaveAttribute('open');
    }
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

test('CV and contact controls use real destinations while the header shows truthful availability', async ({
  page,
}) => {
  await openPreview(page);
  const currentProfile = profileSource as {
    cv: null | { path: string; filename: string };
    cvPreviewUrl: string | null;
    contact: { email: string | null };
  };
  if (currentProfile.cv) {
    await expect(page.locator('[data-analytics-event="cv_view"]')).toHaveCount(
      0,
    );
    const cv = page.locator('a[data-analytics-event="cv_download"]');
    expect(await cv.count()).toBeGreaterThanOrEqual(2);
    for (const link of await cv.all()) {
      await expect(link).toHaveRole('link');
      await expect(link).toContainText(ui.actions.cvDownloadLabel);
      await expect(link).toHaveAttribute(
        'download',
        currentProfile.cv.filename,
      );
    }
    const href = await cv.first().getAttribute('href');
    expect(href).toBeTruthy();
    const pdf = await page.request.get(new URL(href!, page.url()).href);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()['content-type']).toMatch(/application\/pdf/i);
    expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
    const download = await Promise.all([
      page.waitForEvent('download'),
      cv.first().click(),
    ]).then(([download]) => download);
    expect(download.suggestedFilename()).toBe(currentProfile.cv.filename);
    expect(await download.failure()).toBeNull();
  } else if (currentProfile.cvPreviewUrl) {
    const previewCV = page.locator('a[data-analytics-event="cv_view"]');
    expect(await previewCV.count()).toBeGreaterThanOrEqual(2);
    for (const link of await previewCV.all()) {
      await expect(link).toHaveRole('link');
      await expect(link).toContainText(ui.actions.cvViewLabel);
      await expect(link).toHaveAttribute('href', currentProfile.cvPreviewUrl);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
    }
    await expect(page.locator('a[download]')).toHaveCount(0);
  } else
    await expect(
      page
        .getByRole('button', { name: ui.actions.cvPendingLabel, exact: true })
        .first(),
    ).toBeDisabled();
  const email = page.locator(
    `#contact a[href="mailto:${currentProfile.contact.email}"]`,
  );
  if (currentProfile.contact.email) {
    expect(await email.count()).toBeGreaterThanOrEqual(1);
    await expect(email.first()).toBeVisible();
    const addressLink = page.locator(
      '#contact .contact-list a[href^="mailto:"]',
    );
    await expect(addressLink).toHaveAttribute(
      'aria-label',
      currentProfile.contact.email,
    );
    expect(
      await addressLink.evaluate((element) => element.textContent?.trim()),
    ).toBe(currentProfile.contact.email);
  } else await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
  await expect(page.getByLabel(/^Language:/)).toHaveCount(0);
  const availability = page.locator('header .header-availability');
  if (profileSource.contact.availability) {
    await expect(availability).toHaveText(profileSource.contact.availability);
    await expect(availability).toBeVisible();
  } else await expect(availability).toHaveCount(0);
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
    const destination =
      ui.navigation.find((link) => link.href === '#contact') ??
      ui.navigation.at(-1)!;
    await nav
      .getByRole('link', { name: destination.label, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`${destination.href}$`));
    await expect(page.locator(destination.href)).toBeInViewport();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    const expertisePanels = page.locator(
      '#expertise [role="tabpanel"], #expertise [data-expertise-panel]',
    );
    expect(await expertisePanels.count()).toBe(categoryCount);
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
  for (const name of [ui.brand, ui.footer.backToTopLabel]) {
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

test('optional analytics stays off without consent and privacy preferences remain accessible', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (/clarity\.(?:ms|microsoft\.com)/.test(request.url()))
      requests.push(request.url());
  });
  await openPreview(page);
  await expect(page.locator('[data-consent-root]')).toHaveAttribute(
    'data-enabled',
    String(analyticsEnabled),
  );
  await expect(page.locator('#consent-banner')).toBeHidden();
  const opener = page
    .getByRole('contentinfo')
    .getByRole('button', { name: ui.footer.preferencesLabel, exact: true });
  await opener.click();
  const dialog = page.getByRole('dialog', {
    name: 'Privacy preferences',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  const dialogBounds = await dialog.boundingBox();
  const viewport = page.viewportSize()!;
  expect(dialogBounds).not.toBeNull();
  expect(
    Math.abs(
      (dialogBounds?.x ?? 0) +
        (dialogBounds?.width ?? 0) / 2 -
        viewport.width / 2,
    ),
  ).toBeLessThanOrEqual(2);
  expect(
    Math.abs(
      (dialogBounds?.y ?? 0) +
        (dialogBounds?.height ?? 0) / 2 -
        viewport.height / 2,
    ),
  ).toBeLessThanOrEqual(2);
  await expect(dialog.getByRole('status')).toHaveText(
    analyticsEnabled ? /rejected/ : /currently disabled/,
  );
  for (const name of ['Accept analytics', 'Reject analytics']) {
    const choice = dialog.getByRole('button', { name, exact: true });
    if (analyticsEnabled) await expect(choice).toBeEnabled();
    else await expect(choice).toBeDisabled();
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await expect(page.locator('#folio-clarity-script')).toHaveCount(0);
  expect(requests).toEqual([]);
});

test('privacy page has useful content, working home navigation and WCAG 2.2 AA semantics', async ({
  page,
}) => {
  await openPreview(page);
  await page
    .getByRole('contentinfo')
    .getByRole('link', { name: ui.footer.privacyLabel, exact: true })
    .click();
  await expect(page).toHaveURL(/\/privacy\/$/);
  await expect(
    page.getByRole('heading', {
      name: 'Privacy policy',
      level: 1,
      exact: true,
    }),
  ).toBeVisible();
  for (const title of [
    'Contact and personal information',
    'Hosting and essential features',
    'Optional Microsoft Clarity',
    'Your choice and withdrawal',
    'Your rights',
  ]) {
    await expect(
      page.getByRole('heading', { name: title, exact: true }),
    ).toBeVisible();
  }
  await expect(
    page.getByText(
      analyticsEnabled
        ? /Optional analytics is configured\. Clarity starts only after you accept analytics\./
        : /Optional analytics is currently disabled\. This version does not load Microsoft Clarity\./,
    ),
  ).toBeVisible();
  const privacyContact = page.getByText(/is responsible for the use/);
  await expect(privacyContact).toContainText(
    /portfolio\.\s+(For privacy requests|Contact details)/,
  );
  await expect(privacyContact).toContainText(/\.\s+An email link/);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.locator('.privacy-page > a.text-link').click();
  await expect(page.locator('#home')).toBeVisible();
});

test('canonical, sharing metadata, robots and sitemap obey the configured origin and base', async ({
  page,
  request,
}, testInfo) => {
  await openPreview(page);
  const origin = process.env['SITE_URL'];
  const localBase = new URL(testInfo.project.use.baseURL as string).pathname;
  if (origin) {
    const canonical = `${new URL(origin).origin}${localBase}`;
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      canonical,
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      canonical,
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      new RegExp(`^${new URL(origin).origin.replaceAll('.', '\\.')}.*\\.webp$`),
    );
    const sitemap = await request.get('./sitemap-index.xml');
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain(new URL(origin).origin);
  } else await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  const robots = await request.get('./robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toBe(
    indexable && origin
      ? `User-agent: *\nAllow: /\nSitemap: ${new URL(origin).origin}${localBase}sitemap-index.xml\n`
      : 'User-agent: *\nDisallow: /\n',
  );
  const person = JSON.parse(
    await page.locator('script[type="application/ld+json"]').innerText(),
  );
  expect(person.name).toBe(profileSource.identity.name);
  expect(person.jobTitle).toBe(profileSource.identity.jobTitle);
  expect(person.sameAs).toEqual(
    profileSource.contact.links.map((link) => link.url),
  );
});
