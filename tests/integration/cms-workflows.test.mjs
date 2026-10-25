import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { imageMetadata } from 'astro/assets/utils';
import { getFileInfo } from 'prettier';
import { validateRepositoryContent } from '../../scripts/validate-content.mjs';
import {
  parsePublicProfile,
  sectionTargetSchema,
} from '../../src/lib/content.ts';

// These are local repository-save simulations. No CMS account is authenticated,
// no commits are made, and none of the temporary content enters the real source.
const source = resolve('.');
const astroManifest = JSON.parse(
  readFileSync(join(source, 'node_modules/astro/package.json'), 'utf8'),
);
const astroBinary = join(
  source,
  'node_modules/astro',
  typeof astroManifest.bin === 'string'
    ? astroManifest.bin
    : astroManifest.bin.astro,
);
let fixture;
let baselineHTML;
const originals = new Map();
const uploaded = [];
const contentPaths = [
  'src/data/profile.json',
  'src/data/interface.json',
  'src/data/media.json',
  'src/content/professional-highlights.json',
  'src/content/case-studies.json',
  'src/content/skills.json',
  'src/content/expertise.json',
  'src/content/experience.json',
  'src/content/education.json',
  'src/content/languages.json',
];
const escapedText = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll("'", '&#39;')
    .replaceAll('"', '&quot;');

const pathFor = (path) => join(fixture, path);
const readJSON = (path) => JSON.parse(readFileSync(pathFor(path), 'utf8'));
function saveJSON(path, value) {
  // Match the observed Pages CMS commit serialization, including no final newline.
  writeFileSync(pathFor(path), JSON.stringify(value, null, 2));
}
function upload(path, data) {
  mkdirSync(dirname(pathFor(path)), { recursive: true });
  writeFileSync(pathFor(path), data);
  uploaded.push(path);
}

function build(expectSuccess = true, verifyOutput = false) {
  const env = {
    ...process.env,
    ASTRO_TELEMETRY_DISABLED: '1',
    SITE_URL: 'https://folio.test',
    BASE_PATH: '/folio',
    SITE_INDEXABLE: 'false',
    CLARITY_ENABLED: 'false',
    CLARITY_PROJECT_ID: '',
  };
  const result = spawnSync(process.execPath, [astroBinary, 'build'], {
    cwd: fixture,
    env,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 5_000_000,
  });
  if (expectSuccess) {
    assert.equal(result.status, 0, result.stderr || result.stdout);
    if (verifyOutput) {
      const verification = spawnSync(
        process.execPath,
        [pathFor('scripts/verify-build.mjs')],
        { cwd: fixture, env, encoding: 'utf8', timeout: 30_000 },
      );
      assert.equal(
        verification.status,
        0,
        verification.stderr || verification.stdout,
      );
    }
    return readFileSync(pathFor('dist/index.html'), 'utf8');
  }
  assert.notEqual(result.status, 0, 'Invalid content unexpectedly built.');
  return `${result.stderr}\n${result.stdout}`;
}

before(
  async () => {
    fixture = mkdtempSync(join(tmpdir(), 'folio-cms-workflow-'));
    for (const path of [
      'src',
      'public',
      'scripts',
      'astro.config.ts',
      'tsconfig.json',
      'package.json',
      'package-lock.json',
      '.pages.yml',
    ]) {
      if (existsSync(join(source, path)))
        cpSync(join(source, path), pathFor(path), { recursive: true });
    }
    symlinkSync(join(source, 'node_modules'), pathFor('node_modules'), 'dir');
    for (const path of contentPaths)
      originals.set(path, readFileSync(pathFor(path)));
    await validateRepositoryContent(fixture);
    baselineHTML = build();
  },
  { timeout: 120_000 },
);

afterEach(() => {
  for (const [path, data] of originals) writeFileSync(pathFor(path), data);
  for (const path of uploaded.splice(0)) rmSync(pathFor(path), { force: true });
});
after(() => {
  if (fixture) rmSync(fixture, { recursive: true, force: true });
});

test(
  'CMS serialization: omitted optional values and no final newline pass publication checks without bypassing validation',
  { timeout: 120_000 },
  async () => {
    const profile = readJSON('src/data/profile.json');
    if (profile.about.interests?.length === 0) delete profile.about.interests;
    if (profile.seo.socialImage === null) delete profile.seo.socialImage;
    saveJSON('src/data/profile.json', profile);
    const media = readJSON('src/data/media.json');
    if (media.logo === null) delete media.logo;
    saveJSON('src/data/media.json', media);
    const skills = readJSON('src/content/skills.json');
    for (const skill of skills) {
      if (skill.proficiency === null) delete skill.proficiency;
      if (skill.selfAssessment === null) delete skill.selfAssessment;
    }
    saveJSON('src/content/skills.json', skills);
    const ignorePath = join(source, '.prettierignore');
    for (const path of contentPaths) {
      saveJSON(path, readJSON(path));
      assert.equal(readFileSync(pathFor(path), 'utf8').endsWith('\n'), false);
      assert.equal(
        (await getFileInfo(join(source, path), { ignorePath })).ignored,
        true,
      );
    }
    for (const path of ['src/lib/content.ts', '.pages.yml', 'package.json'])
      assert.equal(
        (await getFileInfo(join(source, path), { ignorePath })).ignored,
        false,
      );
    await validateRepositoryContent(fixture);
    assert.equal(build(true, true), baselineHTML);

    // Ignoring CMS serialization never permits malformed JSON to publish.
    writeFileSync(pathFor('src/content/skills.json'), '[{"id":');
    await assert.rejects(() => validateRepositoryContent(fixture), SyntaxError);
  },
);

test(
  'CMS workflow: save text, validate it, and render it in a real static build',
  { timeout: 120_000 },
  async () => {
    const profile = readJSON('src/data/profile.json');
    profile.hero.summary = 'CMS integration fixture: a temporary introduction.';
    profile.contact.email = null;
    saveJSON('src/data/profile.json', profile);
    const ui = readJSON('src/data/interface.json');
    ui.navigation.reverse();
    ui.navigation[0].label = 'CMS navigation fixture';
    const publicProfile = parsePublicProfile(profile);
    const cvLabel = publicProfile.cv
      ? 'cvDownloadLabel'
      : publicProfile.cvPreviewUrl
        ? 'cvViewLabel'
        : 'cvPendingLabel';
    ui.actions[cvLabel] = publicProfile.cv
      ? 'Download CMS CV fixture'
      : publicProfile.cvPreviewUrl
        ? 'Open profile CV'
        : 'CV unavailable in CMS fixture';
    ui.contact.primaryActionLabel = 'CMS contact fixture';
    ui.hero.primaryAction = { label: 'CMS hero fixture', href: '#contact' };
    ui.expertise.titleLines = ['CMS expertise', 'fixture'];
    ui.hero.signature = ['Connect', 'Analyze', 'Deliver', 'Improve'];
    saveJSON('src/data/interface.json', ui);
    await validateRepositoryContent(fixture);
    const html = build();
    const expectedNavigation = sectionTargetSchema.options.filter((href) =>
      ui.navigation.some((link) => link.href === href),
    );
    const renderedNavigation = [
      ...html.matchAll(
        /<nav\b[^>]*aria-label="(?:Main|Footer) navigation"[^>]*>([\s\S]*?)<\/nav>/g,
      ),
    ];
    assert.equal(renderedNavigation.length, 2);
    for (const [, markup] of renderedNavigation)
      assert.deepEqual(
        [...markup.matchAll(/href="[^"]*(#[^"\s]+)"/g)].map(
          (match) => match[1],
        ),
        expectedNavigation,
        'Header and footer must retain website section order after an owner reorders editor entries.',
      );
    assert.ok(html.includes(profile.hero.summary));
    assert.match(html, /hero-signature--custom/);
    for (const text of [
      ui.navigation[0].label,
      ui.actions[cvLabel],
      ui.hero.primaryAction.label,
      ...ui.expertise.titleLines,
    ])
      assert.ok(
        html.includes(escapedText(text)),
        `CMS copy was not rendered: ${text}`,
      );
    assert.match(
      html,
      /data-analytics-event="explore_work"[^>]*href="#contact"/,
    );
    assert.ok(!html.includes('mailto:null'));
    const privacy = readFileSync(pathFor('dist/privacy/index.html'), 'utf8');
    assert.ok(
      !privacy.includes('mailto:null'),
      'Cleared email must never become a fake address.',
    );
    if (profile.contact.links[0])
      assert.ok(privacy.includes(profile.contact.links[0].url));
    assert.ok(
      !html.includes(
        JSON.parse(originals.get('src/data/profile.json')).hero.summary,
      ),
    );
  },
);

test(
  'CMS workflow: a custom SEO title and cleared optional CV use the canonical verification contract',
  { timeout: 120_000 },
  async () => {
    const profile = readJSON('src/data/profile.json');
    profile.seo.title = 'Senior IT Business Analyst Portfolio';
    profile.cv = { path: '', filename: '', updatedAt: '', language: '' };
    profile.cvPreviewUrl = 'https://example.test/public-cv';
    saveJSON('src/data/profile.json', profile);
    const ui = readJSON('src/data/interface.json');
    await validateRepositoryContent(fixture);
    let html = build(true, true);
    assert.ok(
      html.includes(
        `<title>${profile.seo.title} | ${escapedText(ui.brand)}</title>`,
      ),
    );
    assert.ok(html.includes(`href="${profile.cvPreviewUrl}"`));
    assert.ok(html.includes(escapedText(ui.actions.cvViewLabel)));
    assert.ok(!/<a\b[^>]*\bdownload(?:=|[\s>])/.test(html));

    profile.cvPreviewUrl = '';
    saveJSON('src/data/profile.json', profile);
    await validateRepositoryContent(fixture);
    html = build(true, true);
    assert.ok(html.includes(escapedText(ui.actions.cvPendingLabel)));
    assert.ok(!/<a\b[^>]*\bdownload(?:=|[\s>])/.test(html));
  },
);

test(
  'CMS workflow: coordinated Hero, Skills, Education, Languages and achievements render from one validated source snapshot',
  { timeout: 120_000 },
  async () => {
    const profile = readJSON('src/data/profile.json');
    profile.hero.summary = 'Coordinated editorial recovery fixture.';
    const expertise = readJSON('src/content/expertise.json');
    const skills = readJSON('src/content/skills.json');
    const education = readJSON('src/content/education.json');
    const languages = readJSON('src/content/languages.json');
    const experience = readJSON('src/content/experience.json');
    const publication = { order: 0, status: 'published', visible: true };
    expertise.push({
      ...publication,
      id: 'cms-coordinated-category',
      title: 'Coordinated fixture category',
      description: '',
    });
    for (const selfAssessment of [90, 100])
      skills.push({
        ...publication,
        id: `cms-coordinated-skill-${selfAssessment}`,
        name: `Coordinated fixture skill ${selfAssessment}`,
        categoryId: 'cms-coordinated-category',
        selfAssessment,
      });
    education.push({
      ...publication,
      id: 'cms-coordinated-education',
      institution: 'Coordinated fixture institution',
      qualification: 'Coordinated fixture qualification',
      field: '',
      startDate: '2020-01',
      endDate: '2021-01',
      current: false,
    });
    languages.push({
      ...publication,
      id: 'cms-coordinated-language',
      name: 'Coordinated fixture language',
      code: 'en',
      proficiency: '',
    });
    experience.push({
      ...publication,
      id: 'cms-coordinated-experience',
      role: 'Coordinated fixture role',
      organization: 'Coordinated fixture organization',
      location: '',
      summary: '',
      startDate: '2020-01',
      endDate: '',
      current: true,
      achievements: ['Coordinated fixture achievement'],
      skillIds: ['cms-coordinated-skill-90'],
    });
    // These are separate repository writes before validation, not a claim of live CMS atomic saves.
    for (const [path, value] of [
      ['src/data/profile.json', profile],
      ['src/content/expertise.json', expertise],
      ['src/content/skills.json', skills],
      ['src/content/education.json', education],
      ['src/content/languages.json', languages],
      ['src/content/experience.json', experience],
    ])
      saveJSON(path, value);
    await validateRepositoryContent(fixture);
    const html = build();
    for (const text of [
      profile.hero.summary,
      'Coordinated fixture qualification',
      'Coordinated fixture institution',
      'Coordinated fixture language',
      'Coordinated fixture achievement',
    ])
      assert.ok(
        html.includes(text),
        `Coordinated content was not rendered: ${text}`,
      );
    for (const value of [90, 100])
      assert.match(
        html,
        new RegExp(
          `<meter[^>]*value="${value}"[^>]*aria-label="Coordinated fixture skill ${value} self-assessment"`,
        ),
      );

    education.at(-1).current = true;
    saveJSON('src/content/education.json', education);
    await assert.rejects(
      () => validateRepositoryContent(fixture),
      /current record cannot have an end date/i,
    );
    education.at(-1).current = false;
    saveJSON('src/content/education.json', education);
    languages.at(-1).code = 'INVALID';
    saveJSON('src/content/languages.json', languages);
    await assert.rejects(
      () => validateRepositoryContent(fixture),
      /invalid|regex|pattern/i,
    );
  },
);

test(
  'CMS workflow: replace portrait and logo while legacy analytics media stays out of Skills',
  { timeout: 120_000 },
  async () => {
    const media = readJSON('src/data/media.json');
    const raster = readFileSync(pathFor(media.alpine.path.slice(1)));
    const metadata = await imageMetadata(raster, media.alpine.path);
    const mixedCaseExtension = [...extname(media.alpine.path)]
      .map((letter, index) =>
        index % 2 ? letter.toUpperCase() : letter.toLowerCase(),
      )
      .join('');
    const uploadedPath = `src/assets/cms-workflow-portrait${mixedCaseExtension}`;
    upload(uploadedPath, raster);
    media.portrait = {
      path: `/${uploadedPath}`,
      alt: 'CMS integration portrait fixture',
      temporary: true,
    };
    media.logo = {
      path: `/${uploadedPath}`,
      alt: 'CMS integration logo fixture',
    };
    media.analytics = {
      path: `/${uploadedPath}`,
      alt: 'CMS integration analytics fixture',
      illustrative: true,
    };
    saveJSON('src/data/media.json', media);
    await validateRepositoryContent(fixture);
    const html = build();
    assert.equal(
      (html.match(/alt="CMS integration portrait fixture"/g) ?? []).length,
      2,
    );
    assert.equal(
      (html.match(/alt="CMS integration logo fixture"/g) ?? []).length,
      2,
    );
    assert.doesNotMatch(
      html,
      /alt="CMS integration analytics fixture"/,
      'Skills intentionally omits the laptop illustration, even when legacy media is configured.',
    );
    const portraitTag = html.match(
      /<img\b[^>]*alt="CMS integration portrait fixture"[^>]*>/,
    )?.[0];
    assert.ok(portraitTag, 'Uploaded portrait is missing.');
    // Astro deduplicates byte-identical inputs under the original basename.
    // Verify the selected raster and emitted asset rather than its basename.
    assert.ok(portraitTag.includes(`width="${metadata.width}"`));
    assert.ok(portraitTag.includes(`height="${metadata.height}"`));
    const renderedSource = portraitTag.match(/src="([^"]+)"/)?.[1];
    assert.ok(renderedSource?.startsWith('/folio/_astro/'));
    assert.ok(
      existsSync(pathFor(`dist/${renderedSource.slice('/folio/'.length)}`)),
    );
    assert.ok(
      !html.includes('src="/src/assets/'),
      'Unprocessed source path escaped into HTML.',
    );
    const replacement = readFileSync(pathFor(media.contact.path.slice(1)));
    const replacementMetadata = await imageMetadata(
      replacement,
      media.contact.path,
    );
    upload(uploadedPath, replacement);
    await validateRepositoryContent(fixture);
    const replacedHTML = build();
    const replacementTag = replacedHTML.match(
      /<img\b[^>]*alt="CMS integration portrait fixture"[^>]*>/,
    )?.[0];
    assert.ok(
      replacementTag,
      'Replacing an image at the same source path lost its reference.',
    );
    assert.ok(replacementTag.includes(`width="${replacementMetadata.width}"`));
    assert.ok(
      replacementTag.includes(`height="${replacementMetadata.height}"`),
    );
    media.analytics = null;
    saveJSON('src/data/media.json', media);
    await validateRepositoryContent(fixture);
    const withoutAnalytics = build();
    assert.ok(
      !/<figure\b[^>]*class="expertise-visual"/.test(withoutAnalytics),
      'Clearing legacy optional analytics media must keep the Skills illustration absent.',
    );
  },
);

test(
  'CMS workflow: upload a PDF and expose a real base-aware CV download',
  { timeout: 120_000 },
  async () => {
    // A valid, intentionally empty one-page PDF fixture, never a fabricated CV.
    const pdf = createFixturePDF();
    upload('public/documents/cms-workflow.pdf', pdf);
    const profile = readJSON('src/data/profile.json');
    profile.cv = {
      path: '/documents/cms-workflow.pdf',
      filename: 'cms-workflow.pdf',
      updatedAt: '2026-10-23',
      language: 'en',
    };
    saveJSON('src/data/profile.json', profile);
    await validateRepositoryContent(fixture);
    const html = build();
    assert.match(html, /href="\/folio\/documents\/cms-workflow\.pdf"/);
    assert.match(html, /download="cms-workflow\.pdf"/);
    assert.ok(
      html.includes(
        escapedText(
          readJSON('src/data/interface.json').actions.cvDownloadLabel,
        ),
      ),
    );
    assert.deepEqual(
      readFileSync(pathFor('dist/documents/cms-workflow.pdf')),
      pdf,
    );
    const replacement = createFixturePDF('Replacement document fixture');
    assert.notDeepEqual(replacement, pdf);
    upload('public/documents/cms-workflow.pdf', replacement);
    await validateRepositoryContent(fixture);
    build();
    assert.deepEqual(
      readFileSync(pathFor('dist/documents/cms-workflow.pdf')),
      replacement,
      'Replacing an existing CV path must publish the replacement bytes.',
    );
  },
);

test(
  'CMS workflow: edit project text, image, and order without changing renderer code',
  { timeout: 120_000 },
  async () => {
    const projects = readJSON('src/content/case-studies.json').filter(
      (project) => project.status === 'published' && project.visible,
    );
    const media = readJSON('src/data/media.json');
    // Create isolated examples when the owner has hidden or removed all cases.
    // The ordering contract still needs three independently editable records.
    while (projects.length < 3)
      projects.push({
        id: `cms-ordering-fixture-${projects.length}`,
        order: projects.length,
        status: 'published',
        visible: true,
        title: `CMS ordering fixture ${projects.length}`,
        summary: 'Temporary project used only to validate ordering.',
        sector: null,
        challenge: 'CMS ordering validation.',
        contribution: 'Isolated integration test.',
        outcomes: [],
        limitations: [],
        skillIds: [],
        image: null,
        link: null,
      });
    for (const [index, project] of projects.entries())
      project.order = projects.length - index;
    const first = projects.at(-1);
    first.title = 'CMS integration project fixture';
    first.image = {
      path: media.alpine.path,
      alt: 'CMS integration project image',
      illustrative: true,
    };
    saveJSON('src/content/case-studies.json', projects);
    await validateRepositoryContent(fixture);
    const html = build();
    assert.match(html, /alt="CMS integration project image"/);
    const positions = [...projects]
      .reverse()
      .map((project) => html.indexOf(`>${escapedText(project.title)}</h3>`));
    assert.ok(
      positions.every((position) => position >= 0),
      'Edited project titles were not rendered.',
    );
    assert.deepEqual(
      positions,
      [...positions].sort((left, right) => left - right),
    );
    for (const project of projects) project.visible = false;
    saveJSON('src/content/case-studies.json', projects);
    await validateRepositoryContent(fixture);
    const hiddenHTML = build();
    assert.ok(!/<article\b[^>]*class="project-card"/.test(hiddenHTML));
    assert.ok(
      hiddenHTML.includes(
        escapedText(readJSON('src/data/interface.json').projects.emptyMessage),
      ),
    );
  },
);

test(
  'CMS workflow: restore exact previous content and reproduce the original output',
  { timeout: 120_000 },
  async () => {
    const profile = readJSON('src/data/profile.json');
    profile.hero.summary = 'CMS rollback fixture: intentionally temporary.';
    saveJSON('src/data/profile.json', profile);
    assert.ok(build().includes(profile.hero.summary));
    writeFileSync(
      pathFor('src/data/profile.json'),
      originals.get('src/data/profile.json'),
    );
    await validateRepositoryContent(fixture);
    assert.equal(
      build(),
      baselineHTML,
      'Restoring original source must reproduce the original HTML.',
    );
  },
);

test(
  'CMS workflow: proficiency and numeric self-assessment remain independent and truthful when missing',
  { timeout: 120_000 },
  async () => {
    const categories = readJSON('src/content/expertise.json');
    const skills = readJSON('src/content/skills.json');
    let publicCategory = categories.find(
      (entry) => entry.status === 'published' && entry.visible,
    );
    if (!publicCategory) {
      publicCategory = {
        id: 'cms-proficiency-category',
        order: 0,
        status: 'published',
        visible: true,
        title: 'CMS proficiency fixture',
        description: null,
      };
      categories.push(publicCategory);
    }
    while (
      skills.filter((entry) => entry.status === 'published' && entry.visible)
        .length < 2
    )
      skills.push({
        id: `cms-proficiency-skill-${skills.length}`,
        order: skills.length,
        status: 'published',
        visible: true,
        name: 'CMS proficiency fixture',
        categoryId: publicCategory.id,
        proficiency: null,
      });
    for (const skill of skills) {
      skill.proficiency = null;
      skill.selfAssessment = null;
    }
    saveJSON('src/content/expertise.json', categories);
    saveJSON('src/content/skills.json', skills);
    const ui = readJSON('src/data/interface.json');
    await validateRepositoryContent(fixture);
    let html = build();
    assert.equal((html.match(/class="skill-proficiency"/g) ?? []).length, 0);
    assert.equal((html.match(/<meter\b/g) ?? []).length, 0);
    assert.ok(html.includes(escapedText(ui.expertise.proficiencyNote)));
    assert.ok(!html.includes(escapedText(ui.expertise.partialProficiencyNote)));
    const published = skills.filter(
      (entry) => entry.status === 'published' && entry.visible,
    );
    published[0].proficiency = 'advanced';
    published[1].selfAssessment = 1;
    saveJSON('src/content/skills.json', skills);
    await validateRepositoryContent(fixture);
    html = build();
    assert.equal((html.match(/class="skill-proficiency"/g) ?? []).length, 1);
    assert.match(html, /class="skill-proficiency"[^>]*>advanced<\/small>/);
    const partialBars = html.match(/<meter\b[^>]*>/g) ?? [];
    assert.equal(partialBars.length, 1);
    assert.match(partialBars[0], /value="1"/);
    assert.match(partialBars[0], /min="1"/);
    assert.match(partialBars[0], /max="100"/);
    assert.match(html, /self-assessed/i);
    assert.ok(html.includes(escapedText(ui.expertise.partialProficiencyNote)));
    assert.ok(!html.includes(escapedText(ui.expertise.proficiencyNote)));
    for (const skill of published) skill.proficiency = 'advanced';
    published[1].selfAssessment = 100;
    saveJSON('src/content/skills.json', skills);
    await validateRepositoryContent(fixture);
    html = build();
    assert.equal(
      (html.match(/class="skill-proficiency"/g) ?? []).length,
      published.length,
    );
    assert.ok(!html.includes(escapedText(ui.expertise.proficiencyNote)));
    assert.ok(!html.includes(escapedText(ui.expertise.partialProficiencyNote)));
    const maximumBars = html.match(/<meter\b[^>]*>/g) ?? [];
    assert.equal(maximumBars.length, 1);
    assert.match(maximumBars[0], /value="100"/);
    // A CMS save outside the approved 1–100 domain must fail before publishing.
    published[1].selfAssessment = 0;
    saveJSON('src/content/skills.json', skills);
    await assert.rejects(() => validateRepositoryContent(fixture));
  },
);

test(
  'CMS workflow: invalid saves fail validation and cannot produce a successful build',
  { timeout: 120_000 },
  async () => {
    const profile = readJSON('src/data/profile.json');
    profile.identity.name = '';
    saveJSON('src/data/profile.json', profile);
    await assert.rejects(() => validateRepositoryContent(fixture));
    assert.match(build(false), /validation|identity|name|Too small|invalid/i);
    writeFileSync(
      pathFor('src/data/profile.json'),
      originals.get('src/data/profile.json'),
    );

    const missingMedia = readJSON('src/data/media.json');
    missingMedia.portrait.path = '/src/assets/does-not-exist.webp';
    saveJSON('src/data/media.json', missingMedia);
    await assert.rejects(
      () => validateRepositoryContent(fixture),
      /asset|image|exist|missing/i,
    );
    writeFileSync(
      pathFor('src/data/media.json'),
      originals.get('src/data/media.json'),
    );

    const media = readJSON('src/data/media.json');
    media.portrait.path = '/src/assets/../../private.png';
    saveJSON('src/data/media.json', media);
    await assert.rejects(() => validateRepositoryContent(fixture));
    writeFileSync(
      pathFor('src/data/media.json'),
      originals.get('src/data/media.json'),
    );
    const ui = readJSON('src/data/interface.json');
    ui.hero.primaryAction.href = 'javascript:alert(1)';
    saveJSON('src/data/interface.json', ui);
    await assert.rejects(() => validateRepositoryContent(fixture));
    assert.match(build(false), /validation|href|Invalid|invalid/i);
  },
);

function createFixturePDF(comment = '') {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] /Resources << >> /Contents 4 0 R >>',
    '<< /Length 0 >>\nstream\n\nendstream',
  ];
  let contents = `%PDF-1.4\n${comment ? `% ${comment}\n` : ''}`;
  const offsets = [0];
  for (const [index, value] of objects.entries()) {
    offsets.push(Buffer.byteLength(contents));
    contents += `${index + 1} 0 obj\n${value}\nendobj\n`;
  }
  const xref = Buffer.byteLength(contents);
  contents += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1))
    contents += `${String(offset).padStart(10, '0')} 00000 n \n`;
  contents += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(contents);
}
