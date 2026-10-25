# FOLIO

Static-first professional portfolio for Konstantin Arutjunov, published at [amarok90.github.io/folio](https://amarok90.github.io/folio/). The complete responsive interface includes header, hero, professional highlights, expertise, selected case studies, career journey, about, contact, and footer. Local non-indexable builds display **Design preview — Content verification pending**. Indexable release builds omit that technical banner; temporary portraits and illustrative images retain their honest labels. Source-backed career content and owner-confirmed technical skills are implemented. Task 4 adds tested local Make commands, ten Pages CMS editors, and automatic GitHub Pages publication after complete validation. Public HTTPS, thirty live E2E checks and production Lighthouse are verified; authenticated CMS editing/upload/rollback acceptance is still pending. The owner separately authorized production Clarity project `z26yinj7ob`, gated by visitor consent; supported local commands and isolated CI fixtures remain offline. See [release status](TASK4-HANDOFF.md) for the exact verified scope.

## Baseline and architecture decisions

The workspace was empty at audit: no application, package manifest, source assets, tests, workflows, or local Git history existed. There was no reusable implementation to migrate or remove. The supplied desktop/mobile design image is the visual authority, but it is not a production portrait, photograph, logo, or content source. The owner supplied the existing empty private [Amarok90/folio](https://github.com/Amarok90/folio) repository; local Git was initialized on `main` and connected to that remote. No existing repository identity or history was replaced.

Astro generates static HTML. Strict TypeScript, Tailwind CSS, centralized CSS custom properties, and reusable Astro components provide the foundation. Native browser features and a small TypeScript navigation enhancement handle interaction. React, client hydration, a backend, a database and animation libraries are unnecessary. Independently tested consent/privacy behavior gates optional production Clarity; local workflows remain offline.

This is one responsive single-page site. Components and content stay separate, and every section uses the same layout and design authority. Build-time validation owns content truth; presentation components consume validated values. Native `details` disclosures provide project details and unavailable contact information. Expertise tabs use a small progressive TypeScript enhancement with semantic relationships and keyboard navigation. Navigation remains usable without JavaScript.

## Local development and validation

The four owner-facing commands run from the repository root:

| Command              | Purpose                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| `make folio.run`     | Start the development server in the foreground                          |
| `make folio.check`   | Run the complete quality suite, including browser and Lighthouse checks |
| `make folio.build`   | Validate content and generate verified static output in `dist/`         |
| `make folio.preview` | Build first, then serve that static output in the foreground            |

Both servers use **http://127.0.0.1:4321/folio/**. Stop them with **Ctrl+C** before running a build or complete check; Astro’s content cache is shared. The launcher uses `--ignore-lock` to prevent Astro’s agent-aware automatic background mode. It creates no daemon and requires no Docker.

`scripts/local-workflow.mjs` reads `.nvmrc` and uses a compatible current Node, an installed nvm Node 24, or Homebrew `node@24`. The owner’s existing nvm Node **24.19.0** is found even when the shell still defaults to Node 22. The launcher does not install runtimes or dependencies. A clean checkout requires Node 24 and locked dependencies first:

```sh
nvm use
npm ci
npx playwright install chromium
make folio.run
```

If no compatible runtime is installed, install the Node version selected by `.nvmrc` using the existing runtime manager. The launcher exits with this prerequisite instead of attempting a download. An explicit runtime and alternate local port are supported:

```sh
FOLIO_NODE=/absolute/path/to/node FOLIO_PORT=4328 make folio.run
```

For local checks, either install Playwright Chromium as above or use the installed Google Chrome binary:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" make folio.check
```

On Linux CI, Playwright also needs system dependencies: `npx playwright install --with-deps chromium`. The complete local check sets CI mode so browser tests start their own production preview and never reuse a running development server. All four Make commands force the intended canonical origin and `/folio/` path, **noindex**, and **Clarity disabled**, regardless of inherited release variables.

Underlying npm commands remain available for focused maintenance:

| Command                   | Purpose                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| `npm run dev`             | Start the Astro development server                                                        |
| `npm run check`           | Astro and strict TypeScript validation                                                    |
| `npm run lint`            | ESLint checks                                                                             |
| `npm run format`          | Apply Prettier formatting                                                                 |
| `npm run format:check`    | Verify formatting without changes                                                         |
| `npm run content:check`   | Validate profile, website wording, collections, CMS parity, media paths and PDF signature |
| `npm run test:cms`        | Isolated edit/build/restore/invalid-content workflows                                     |
| `npm run test:analytics`  | Consent, mock vendor failure and analytics resilience browser suite                       |
| `npm run test:lighthouse` | Mobile and desktop local-candidate audits, all categories ≥95                             |
| `npm run test:unit`       | Configuration, schema, publication, and token checks                                      |
| `npm run test:e2e`        | Browser, keyboard, accessibility, and responsive checks                                   |
| `npm run test:base`       | Verify a GitHub Pages project-path build                                                  |
| `npm run build`           | Generate and verify static pages, rendered primitives and asset budgets in `dist/`        |
| `npm run preview`         | Serve the generated site locally                                                          |
| `npm run audit`           | Fail on high or critical dependency vulnerabilities                                       |
| `npm run validate`        | Run the complete local quality pipeline                                                   |

Build before running browser tests independently. Browser results and screenshots are generated evidence, not source assets. `npm ci` requires registry access on a clean machine; dependency audit also requires access to the npm advisory service. A failed or unavailable advisory request is not a clean security result.

After publication, run the same thirty portfolio interaction, responsive, accessibility and metadata checks against the actual host:

```sh
FOLIO_E2E_URL=https://amarok90.github.io/folio/ \
SITE_URL=https://amarok90.github.io SITE_INDEXABLE=true \
npm run test:e2e
```

Live mode requires an HTTPS URL ending in `/`, starts no local server and excludes the isolated CMS layout fixtures. Supply the browser executable override above on this Mac if Chromium is not installed. Set the origin/indexability to the actual published configuration; an assertion failure is evidence to investigate, not a reason to weaken the tests.

## Design system

The Signature Executive refinement uses the owner's newer approved reference and exact palette: brand `#488AA0`, hover `#3C7689`, navy `#082345`, soft azure `#EAF4F6`, white `#FFFFFF`. The separate `--color-primary-text` token keeps small links and labels at AA contrast; white button text uses darker gradient endpoints. The centered canvas is capped at 1200px, major section gaps are fluid from 56px to 104px, and the Hero/highlights overlap is an intentional exception. Transitions use 180–220ms and reduced-motion overrides.

The section headings precede their content at every viewport: Featured Projects uses the full-width project grid, followed by the Professional Journey timeline. Education appears with About and Languages, preserving the professional records and dates. Skills occupy approximately 65% beside an analytics photograph-style illustration; About places its photo first, with the story and approach beside it. These are documented approximations rather than a pixel-perfect claim. Native disclosures retain complete verified role details without crowding the initial scan. Empty Languages content is omitted.

The approved desktop/mobile reference governs the white/ice-blue canvas, navy type, blue gradients, rounded translucent surfaces, restrained shadows, Alpine imagery, and page composition. Values are coherent approximations, not a claim of pixel-perfect extraction. The full interface preserves that visual direction while keeping missing professional information explicit.

`src/styles/tokens.css` is the design authority. Semantic tokens govern backgrounds and surfaces, readable text, brand colors, borders, focus, interaction states, gradients, shadows, spacing, fluid type, layout width, radii, control sizes, motion, and stacking. Extend these tokens before adding component-specific values. Keep text and control contrast separate from decorative blues. Components inherit their styles from this shared authority.

Inter provides the self-hosted typographic foundation; Caveat supplies the restrained handwritten accent from the approved reference. Fluid type and gutters adapt between compact mobile and large desktop. The layout uses content-driven grids and a mobile navigation pattern; it does not scale a fixed desktop canvas down. CSS motion is restrained and respects reduced-motion preferences. Keyboard focus remains visible, and controls use touch-friendly targets.

## Content and assets

`src/data/profile.json` holds singleton profile content and is validated by `src/data/profile.ts`. Repeated editorial records live in JSON files under `src/content/`, loaded through `src/content.config.ts`; `src/lib/content.ts` owns schemas, stable identifiers, ordering, publication controls, and reference checks. The architecture covers site identity, hero, highlights, expertise, skills, case studies, experience, education, languages, about, contact, CV, and SEO. Pages CMS edits these ordinary repository files through `.pages.yml`; `npm run content:check` validates all schemas, references, media and documents before every production build.

Professional claims must come from owner-provided information or the owner's verified professional profile. Unverified fields remain empty. Source-backed records use the existing publication controls and typed Content Collections; design demonstrations remain separate and are identified when no published record exists. Skill indicators do not imply certified proficiency when the source provides no level. Dates, employers, project descriptions, and metrics must retain the precision and limits of their source. Do not infer claims from the reference artwork, turn missing values into zero, or publish examples as real experience.

Task 2 professional content was checked against [Konstantin Arutjunov's LinkedIn profile](https://www.linkedin.com/in/konstantin-arutjunov/) and its Featured CV in Opera on **2026-10-23**. Only public professional information relevant to this portfolio is retained: role and career history, education, listed skills, project descriptions, and professional contact details. The owner confirmed the approximately 2 hours to 3 minutes loan-processing improvement during this task. That metric and the approximately 65% to 90% insurance-coverage improvement retain their reported precision and measurement limitations; the source does not publish a measurement method or period. The external-bank-statements case does not imply an unreported quantified outcome. Skills have no inferred proficiency ratings, languages remain unpopulated, and no unsupported successful-project count is presented.

The owner separately confirmed experience with Google Cloud Services, RPA automation, ChatGPT, Copilot, and Codex during this task. These items are owner-provided information, not attributed to the LinkedIn profile. They carry no inferred duration, certification, proficiency score, or unsupported project result.

The original portrait, approved logo and final image approval remain external dependencies. Email and LinkedIn are confirmed; language proficiency is intentionally unpopulated. On **2026-10-23**, the owner approved publication of the reviewed CV after factual verification and removal of its draft label. The public document is `public/documents/konstantin-arutjunov-cv.pdf`; its metadata is centralized in `profile.cv`. Private phone/date-of-birth information and disputed qualifications are excluded. Reference-derived generated imagery is explicitly illustrative material, not a verified photograph of the owner, a client, or a delivered project. Replace it with approved originals. The reference image is not shipped as the page UI, and screenshot crops are not treated as high-quality source assets.

CV controls now download the approved local PDF through native, base-path-aware **Download CV** links. Replace the document and edit its metadata in **01 · Profile, contact, CV & SEO → PDF CV** in Pages CMS; every CV action shares this source. When local CV metadata is cleared, **View CV** falls back to the [actual Featured CV viewer](https://www.linkedin.com/in/konstantin-arutjunov/overlay/1753005451683/single-media-viewer/?profileId=ACoAABmyyD0B2egZyOVt5zRFatDd-ssMM7VpIxA), without pretending it is a download. If neither source is present, the control becomes disabled **CV pending**. `cvPreviewUrl` remains a backwards-compatible optional field. The header displays verified availability. Professional contact links use the verified email and LinkedIn profile.

Skills support an independent, optional `selfAssessment` whole number from **1 to 100**, editable in **05 · Skills**. On **2026-10-23**, the owner explicitly approved all twelve assessments shown in the newer reference: Business Analysis 95, Requirements Engineering 92, System Analysis 90, BPMN & Process Modelling 88, Stakeholder Management 90, Solution Design 87, SQL & Data Analysis 88, REST / SOAP APIs 85, JSON / XML 83, Jira & Confluence 90, Testing & QA 82, Integration Analysis 86. These values render native accessible meters, numeric labels and an explicit self-assessment caption. All other scores remain unknown; no qualitative proficiency is inferred. Combined assessments are not transferred to different individual skills, such as XML / XSLT or Integration Testing. The CMS uses documented [number field bounds](https://pagescms.org/docs/configuration/fields/number/); build validation additionally rejects fractions and invalid values.

The new analytics illustration is centralized in `media.analytics` and editable in **09 · Media & CV → Portrait, logo & backgrounds**. Clear it to use a full-width skills layout. The asset is `src/assets/analytics-workspace.webp` (1536×1024; approximately 98KB source, optimized responsive variants), generated with the built-in ImageGen tool. Final prompt: natural editorial photograph of a silver laptop with a blue analytics dashboard on screen, warm pale-wood desk, soft daylight and blurred office greenery; navy/azure/white palette; square-crop safe; no people, logos, readable private data, floating overlays, CGI or neon. It is identified as illustrative, and is not evidence of a client's real dashboard or project.

Store source images in `src/assets/` and use Astro image optimization for responsive dimensions, suitable formats, and stable aspect ratios. Only files intended to be copied unchanged belong in `public/`, such as vetted documents and icons. Keep alt text tied to image meaning; use empty alt text for purely decorative images. Noncritical images should load lazily; only a genuine above-the-fold critical image should receive eager loading and fetch priority. Do not add unrelated stock substitutes.

Font files are self-hosted with their redistribution license retained. Lucide icons render as SVG with accessible naming handled by the containing control or icon wrapper. Avoid external font services and entire icon sets in client JavaScript.

The preview uses Lucide’s Feather as a temporary library mark. It is not the approved FOLIO logo artwork. Both fonts use the SIL Open Font License, retained under `public/fonts/`; the Lucide license is retained under `public/icons/`.

To replace the temporary portrait in Pages CMS, open **09 · Media & CV → Portrait, logo & backgrounds**, upload/select the new portrait, write accurate alt text, and turn off **Temporary portrait**. Save and check **Pages production** in GitHub Actions before removing the previous image. The shared `src/data/media.json` source updates Hero and About together; no code change or filename convention is required. Local maintenance can still replace `src/assets/portrait.png`. Uploaded images remain Astro-optimized raster sources; arbitrary SVG and remote uploads are excluded.

The decorative Caveat font is subset to the fixed signature words **Ideas, Analysis, Solutions, Impact** in `src/assets/fonts/caveat-signature.woff2` (9,228 bytes), preserving the combined font budget. If those words change, regenerate the subset from the locked `@fontsource/caveat` source with FontTools, include the new glyphs, retain the OFL license, and rerun the static font budget check. FontTools is a build-maintenance utility only and is not an application or deployed runtime dependency.

## URLs, SEO, and GitHub Pages

`src/data/interface.json` owns editable website wording and navigation, consumed through `src/config/site.ts`; `src/config/deployment.ts` owns URL configuration. `SITE_URL` is the verified HTTPS origin; `BASE_PATH` is the deployment path (`/` for a root domain, `/folio/` for this project site). The same configuration governs links, static assets, canonical URLs, social metadata, robots, and sitemap output. Person JSON-LD uses only supplied profile facts. A configured origin produces a sitemap. Canonical and OpenGraph URLs are omitted when the origin is unknown, and the 404 never receives a canonical URL.

```sh
# Local static candidate for the intended GitHub project URL; this does not publish it.
make folio.build
make folio.preview
```

The `Quality` workflow runs on pull requests, non-main pushes and manual requests with read-only repository access. Main pushes use the Pages production gates once, avoiding duplicate validation. It uses the lockfile and gates checks, lint, formatting, meaningful tests, dependency audit, a project-path check, the static build, and real Chromium checks. A failure stops the job. Branch protection must be configured in GitHub to require this status; the workflow does not bypass protections.

`Pages production` runs automatically on pushes to `main` and supports manual artifact preparation. Code/configuration changes run every quality gate, including CMS workflows, browser/accessibility checks, dependency audit and Lighthouse. Content-only updates use the same strict content/reference/media validation, configured Astro build and static output checks, dependency audit, and real semantic/responsive/accessibility portfolio browser suite, then upload that exact verified `dist/`. The fast path permits only the ten canonical JSON files and supported raster/PDF paths. It compares the complete diff with the most recent successful production push, not merely the preceding commit: a content save after failed code validation cannot bypass the full gates. Unavailable API/history/ancestry evidence always selects full validation; history acquisition is bounded to 50 commits. Workflow summaries report the selected scope and outcome. The deploy job consumes that same artifact and refuses an older SHA after a newer `main` commit exists. Only the deploy job receives Pages write/OIDC permissions; build validation stays read-only.

Publication is gated by the repository variable **`PAGES_DEPLOY_ENABLED=true`**, plus a push to `main` or an explicit manual **publish** choice on `main`. Keep that variable absent/false until the owner resolves hosting eligibility and selects GitHub Actions as the Pages source. Once armed, a valid CMS save to `main` follows the same validation and automatic publication path. A failing content or quality gate prevents publication.

The production workflow defaults to `SITE_URL=https://amarok90.github.io`, `BASE_PATH=/folio/`, and an indexable artifact. Set repository variable **`SITE_INDEXABLE=false`** to defer indexing while final content/assets remain pending. Local Make commands always remain noindex. Production uses the owner-authorized public Clarity Project ID **`z26yinj7ob`** and defaults `CLARITY_ENABLED` to `true`; setting the repository variable **`CLARITY_ENABLED=false` and redeploying** disables it. This is a build-time switch, so changing the variable alone does not alter existing static HTML. Manual `site_origin`/`base_path` inputs or the `SITE_ORIGIN`/`SITE_BASE_PATH` repository variables support a future custom domain without changing components.

GitHub release operation:

1. Inspect **Pages production** for the current main commit; local results do not substitute for the GitHub run. Quality remains available for manual full validation.
2. The owner approved public visibility and confirmed GitHub Mobile authentication. Pages now uses **Settings → Pages → Build and deployment → GitHub Actions** with HTTPS enforced. The workflow does not change repository visibility or buy a plan.
3. Require the quality status through the repository’s branch protection/ruleset. Configure the `github-pages` environment if deployment reviewers or branch restrictions are desired.
4. `PAGES_DEPLOY_ENABLED=true` is enabled for the intended release. Each valid main push publishes after all gates. Run **Pages production** manually with **publish=false** for an artifact-only review. Confirm the workflow deploy job, public HTTPS response, assets, privacy page and recovery links after publication.

The public URL [https://amarok90.github.io/folio/](https://amarok90.github.io/folio/) has been verified live over HTTPS. A prepared artifact or skipped deployment alone never certifies a newer version or analytics collection.

For a future custom domain, configure that domain and DNS in GitHub Pages first. Set its HTTPS origin and `/` base path; verify canonical, sitemap, asset links and HTTPS before publication.

Official GitHub actions are pinned to full commit SHAs verified against their releases: [checkout](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-node](https://github.com/actions/setup-node/releases/tag/v7.1.0), [upload-pages-artifact](https://github.com/actions/upload-pages-artifact/releases/tag/v5.0.0), and [deploy-pages](https://github.com/actions/deploy-pages/releases/tag/v5.0.1). Review upstream releases and update the pin plus its version comment together; rerun the gates after updates.

## Security and certification boundaries

Only generated static output is deployable. Keep credentials, private documents, `.env` files, and local artifacts out of source control and `public/`. No runtime secrets, forms backend or dynamic HTML injection are needed. Do not put credentials into content or workflow variables. External links must have a meaningful accessible name and use appropriate safe link attributes when opening a new tab.

Automated accessibility checks support WCAG 2.2 AA work; they do not certify the complete final site. Browser tests cover 320, 375, 390, 480, 600, 768, 900, 1024, 1180, 1280, 1440, and 1920 px layouts; menu and tab keyboard behavior; project/contact/language disclosures; reduced motion; no-JavaScript navigation; responsive image loading; and missing-content safety. E2E checks use Chromium in CI. Actual Opera screenshot and interaction inspection is a separate verification requirement; passing Chromium tests alone does not prove Opera visual review.

Set `FOLIO_SCREENSHOT_DIR` to an existing absolute output directory when running E2E checks to capture full-page and viewport evidence at 320, 390, 768, 1024, 1440, and 1920 px. Screenshots are local generated evidence and are not shipped in the site. The static verifier checks every HTML page, local asset and responsive `srcset`, all section anchors, project-path compatibility, non-indexable metadata, no hydration/server leaks, and payload budgets. Lighthouse audits an isolated indexable local candidate at `/folio/`, with gzip text delivery and a conservative 10-minute asset cache. Real-host encoding/cache, field Core Web Vitals, final assets and public-launch certification must be verified in Task 4. Local reports are not evidence of production traffic or deployment.

The output (portfolio, privacy, 404 and a minimal admin shortcut) has bounded budgets of **68,000 bytes CSS**, **14,000 bytes gzip CSS**, **12,000 bytes aggregate client JavaScript**, and **70,000 bytes WOFF2 fonts**. Task 3 adds real consent/privacy behavior: the candidate measured 64,167 CSS bytes, 11,845 gzip CSS bytes, 10,360 aggregate JavaScript bytes and 57,484 font bytes. Aggregate JavaScript counts repeated inline navigation per HTML page, not just a single-page transfer. Budgets protect the approved composition and required behavior; gzip is an estimate until hosting is checked.

## Pages CMS owner workflow

`.pages.yml` offers ten sidebar groups in website order: **Home / Hero**, **Professional Highlights**, **Expertise & Skills**, **Featured Projects**, **Professional Journey**, **About / Education / Languages**, **Contact**, **Footer / Global Settings**, **Media & CV**, and **SEO & Settings**. Each section includes its content and relevant wording editors. The existing ten JSON files remain canonical; no content migration, additional branch or backend is needed. `/folio/admin/` opens the FOLIO Pages CMS interface on `main`, retaining GitHub authentication. The shortcut is noindex and excluded from the sitemap.

Profile and wording editors share their existing object files. Every editor retains the **complete schema and loaded snapshot**, hiding unrelated top-level fields. A field is visible in exactly one editor. `settings.content.merge: false` allows optional objects to clear correctly; merging the previous object can otherwise retain old values or partial CV/image metadata. GitHub's loaded file SHA rejects stale saves rather than silently overwriting another editor's work. These behaviors are supported by the inspected upstream implementation; authenticated hosted-CMS verification remains required. The configuration validator protects full hidden-field coverage, field types, single visible ownership, media paths, and one editor per array. Canonical files cannot be renamed/deleted from content editors; individual records can still be added, removed, hidden and reordered.

1. Open `/folio/admin/`, sign in with the existing GitHub account, and edit the relevant section. **Save** commits to `main`; **Pages production** validates and automatically publishes a healthy revision. A successful Save is not yet a successful publication. Check the workflow outcome and public site.
2. Records use stable reference names. Lower **Display order** numbers appear first. A record appears only when **Published** and **Show on website** are selected; new records default to draft/hidden. Keep the required public profile published. Add an expertise category before referencing it from skills; keep referenced names stable. Skills accept optional whole-number self-assessments from **1 through 100**, including **90 and 100**; blank means unrated, never zero.
3. To replace a portrait or project image: upload a **new filename**, select it in the relevant editor, update its description/provenance, and Save. Wait for Pages production to succeed before removing an unused old file. Uploading alone does not select the image. PNG/JPEG/WebP/AVIF sources are limited to **12 MiB and 40 million pixels** by publication validation. Do not rename/delete a selected asset first. CMS uploads and reference saves are separate Git commits; the last healthy production stays available if an intermediate revision is invalid.
4. In **Media & CV → PDF CV & external fallback**, upload/select a new PDF and fill its download filename, updated date and language. The PDF must be **10 MiB or smaller** and pass the PDF checks. Save and wait for publication before deleting the old document. Contact exposes explicit **View CV** and **Download CV** actions. Clear all four optional PDF fields together to restore the external CV fallback. Clear optional images and their descriptions together; partial groups intentionally block publication.
5. Each editor has its own Save. Rapid saves may cancel superseded builds; the newest healthy revision is published, and the deployment guard refuses a stale main SHA. This is not a cross-editor transaction. Finish and Save each section in turn. GitHub SHA conflicts prevent stale persisted writes, but Pages CMS background revalidation can reset an unsaved draft when another editor saves. Use one editor at a time and Save before switching tabs. If a conflict occurs, retain your intended text, refresh to load the newest revision, and reapply it after review. Live conflict and unsaved-draft behavior must be tested in the hosted CMS; FOLIO configuration cannot guarantee collaborative draft preservation.
6. For recovery, review GitHub file/commit history and restore the affected content/assets from the last healthy revision in a new recovery commit, preserving newer unrelated owner edits. A maintainer can restore specific paths from a known-good commit; never reset/force-push `main` or overwrite the entire repository with an old snapshot. The same validation/publishing gates apply to recovery. Git history is durable; browser state is not a backup.

CMS-generated JSON is intentionally outside developer-source formatting checks. Strict JSON/schema/reference/media/build validation remains mandatory. Integration tests use the observed no-final-newline serialization and omitted optional keys; malformed content still fails. Developer source and CMS configuration retain formatting checks.

`npm run test:cms` uses isolated temporary copies for text, coordinated sections, 90/100 skills, Education/Languages, achievements, image/PDF replacement, ordering/visibility, optional/invalid values and restoration. It validates and builds real static output and restores byte-identical source. It does **not** authenticate to Pages CMS, create GitHub commits, or prove live conflict/upload/rollback behavior. The publication classifier's tests prove conservative revision selection, not real GitHub scheduling. Live CMS → GitHub → production saves, uploads, replacement, conflicts, rollback and latency require a separately approved controlled release. Source changes also retain the full browser, consent and Lighthouse gates.

## Consent-gated production analytics and privacy

Production is configured for the owner-authorized Clarity project **`z26yinj7ob`**. Clarity is **disabled** in every supported local Make command and the Quality workflow. Production browser regression tests reject analytics, while isolated consent tests intercept the fake test project; those runs do not send recordings to Microsoft.

The tag is absent before acceptance and after rejection. Explicit acceptance queues `consentv2` with analytics storage granted and advertising storage denied, then loads one asynchronous vendor tag. Rejection after acceptance persists the decision, clears accessible first-party Clarity cookies and reloads the document to destroy the active recorder. All core functions work without analytics. Visitor choices expire after 180 days and are specific to the project; storage failures fail closed. The live Privacy Policy reflects whether the deployed build is configured.

FOLIO's custom event contract allows names only: `cv_view`, `cv_download`, `linkedin_click`, `email_click`, `explore_work`, `contact_cta`. It accepts no URL, email, CV contents or arbitrary event payload. Only an actual available PDF produces a download action. Clarity's separate automatic usage data can include page and clicked-link URLs, referrer and browser metadata; masking page text is not a claim that all vendor payloads contain only these event names. No custom visitor identity is sent. Core controls never depend on delivery.

`npm run test:analytics` uses an isolated configured build and intercepted local vendor stubs/blocked responses. It proves no pre-consent requests, reject/change/withdrawal, duplicate prevention, storage/vendor failures and independent core behavior. It sends no test recordings to Microsoft and is not live Clarity certification.

Real certification requires the published page, actual tag/collection requests after consent, no optional requests before acceptance or after rejection, withdrawal/reload verification and real custom event transport. Enable Consent Mode in the Clarity project settings and inspect actual dashboard data when authenticated. Without dashboard access, report **LIVE DEPLOYED — DASHBOARD VERIFICATION PENDING**; never infer recordings or heatmaps from a green build. See [Microsoft's consent API](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2) and [installation verification](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-setup).

See [TASK4-HANDOFF.md](TASK4-HANDOFF.md) for owner acceptance and remaining launch gates, and [design-qa.md](design-qa.md) for browser evidence. External hosting/CMS prerequisites above remain distinct from local validation results.
