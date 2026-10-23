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
import { validateRepositoryContent } from '../../scripts/validate-content.mjs';

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
  writeFileSync(pathFor(path), `${JSON.stringify(value, null, 2)}\n`);
}
function upload(path, data) {
  mkdirSync(dirname(pathFor(path)), { recursive: true });
  writeFileSync(pathFor(path), data);
  uploaded.push(path);
}

function build(expectSuccess = true) {
  const result = spawnSync(process.execPath, [astroBinary, 'build'], {
    cwd: fixture,
    env: {
      ...process.env,
      ASTRO_TELEMETRY_DISABLED: '1',
      SITE_URL: 'https://folio.test',
      BASE_PATH: '/folio',
      SITE_INDEXABLE: 'false',
      CLARITY_ENABLED: 'false',
      CLARITY_PROJECT_ID: '',
    },
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 5_000_000,
  });
  if (expectSuccess) {
    assert.equal(result.status, 0, result.stderr || result.stdout);
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
    for (const path of [
      'src/data/profile.json',
      'src/data/interface.json',
      'src/data/media.json',
      'src/content/case-studies.json',
      'src/content/skills.json',
      'src/content/expertise.json',
    ])
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
  'CMS workflow: save text, validate it, and render it in a real static build',
  { timeout: 120_000 },
  async () => {
    const profile = readJSON('src/data/profile.json');
    profile.hero.summary = 'CMS integration fixture: a temporary introduction.';
    profile.contact.email = null;
    saveJSON('src/data/profile.json', profile);
    const ui = readJSON('src/data/interface.json');
    ui.navigation[0].label = 'CMS navigation fixture';
    ui.actions.cvViewLabel = 'Open profile CV';
    ui.contact.primaryActionLabel = 'CMS contact fixture';
    ui.hero.primaryAction = { label: 'CMS hero fixture', href: '#contact' };
    ui.expertise.titleLines = ['CMS expertise', 'fixture'];
    ui.hero.signature = ['Connect', 'Analyze', 'Deliver', 'Improve'];
    saveJSON('src/data/interface.json', ui);
    await validateRepositoryContent(fixture);
    const html = build();
    assert.ok(html.includes(profile.hero.summary));
    assert.match(html, /hero-signature--custom/);
    for (const text of [
      ui.navigation[0].label,
      ui.actions.cvViewLabel,
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
  'CMS workflow: replace the portrait and logo with uploaded image sources',
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
  'CMS workflow: explicit proficiency remains distinct from missing or partly specified levels',
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
    for (const skill of skills) skill.proficiency = null;
    saveJSON('src/content/expertise.json', categories);
    saveJSON('src/content/skills.json', skills);
    const ui = readJSON('src/data/interface.json');
    await validateRepositoryContent(fixture);
    let html = build();
    assert.equal((html.match(/class="skill-proficiency"/g) ?? []).length, 0);
    assert.ok(html.includes(escapedText(ui.expertise.proficiencyNote)));
    assert.ok(!html.includes(escapedText(ui.expertise.partialProficiencyNote)));
    const published = skills.filter(
      (entry) => entry.status === 'published' && entry.visible,
    );
    published[0].proficiency = 'advanced';
    saveJSON('src/content/skills.json', skills);
    await validateRepositoryContent(fixture);
    html = build();
    assert.equal((html.match(/class="skill-proficiency"/g) ?? []).length, 1);
    assert.match(html, /class="skill-proficiency"[^>]*>advanced<\/small>/);
    assert.ok(html.includes(escapedText(ui.expertise.partialProficiencyNote)));
    assert.ok(!html.includes(escapedText(ui.expertise.proficiencyNote)));
    for (const skill of published) skill.proficiency = 'advanced';
    saveJSON('src/content/skills.json', skills);
    await validateRepositoryContent(fixture);
    html = build();
    assert.equal(
      (html.match(/class="skill-proficiency"/g) ?? []).length,
      published.length,
    );
    assert.ok(!html.includes(escapedText(ui.expertise.proficiencyNote)));
    assert.ok(!html.includes(escapedText(ui.expertise.partialProficiencyNote)));
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

function createFixturePDF() {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] /Resources << >> /Contents 4 0 R >>',
    '<< /Length 0 >>\nstream\n\nendstream',
  ];
  let contents = '%PDF-1.4\n';
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
