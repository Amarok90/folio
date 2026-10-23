# FOLIO

Static-first professional portfolio for Konstantin Arutjunov. Task 2 implements the complete responsive interface: header, hero, professional highlights, expertise, selected case studies, career journey, about, contact, and footer. The site is visibly marked **Design preview — Content verification pending** while the temporary portrait and final content approval remain outstanding. Source-backed career content and owner-confirmed technical skills are implemented. Task 3 adds validated Pages CMS configuration, optional consent-gated Microsoft Clarity, privacy controls, production metadata, and executable release gates. Live CMS authorization, approved original assets, hosting eligibility, analytics activation and public launch belong to Task 4. Nothing in Task 3 deploys automatically.

## Baseline and architecture decisions

The workspace was empty at audit: no application, package manifest, source assets, tests, workflows, or local Git history existed. There was no reusable implementation to migrate or remove. The supplied desktop/mobile design image is the visual authority, but it is not a production portrait, photograph, logo, or content source. The owner supplied the existing empty private [Amarok90/folio](https://github.com/Amarok90/folio) repository; local Git was initialized on `main` and connected to that remote. No existing repository identity or history was replaced.

Astro generates static HTML. Strict TypeScript, Tailwind CSS, centralized CSS custom properties, and reusable Astro components provide the foundation. Native browser features and a small TypeScript navigation enhancement handle interaction. React, client hydration, a backend, a database and animation libraries are unnecessary. Optional Microsoft Clarity is disabled by default and loads only after valid consent; all core interactions remain independent of it.

This is one responsive single-page site. Components and content stay separate, and every section uses the same layout and design authority. Build-time validation owns content truth; presentation components consume validated values. Native `details` disclosures provide project details and unavailable contact information. Expertise tabs use a small progressive TypeScript enhancement with semantic relationships and keyboard navigation. Navigation remains usable without JavaScript.

## Local development and validation

Use the Node.js version in `.nvmrc`, then install exact locked dependencies:

```sh
nvm use
npm ci
npx playwright install chromium
npm run dev
```

On Linux CI, Playwright also needs system dependencies: `npx playwright install --with-deps chromium`.

| Command                   | Purpose                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `npm run dev`             | Start the Astro development server                                                 |
| `npm run check`           | Astro and strict TypeScript validation                                             |
| `npm run lint`            | ESLint checks                                                                      |
| `npm run format`          | Apply Prettier formatting                                                          |
| `npm run format:check`    | Verify formatting without changes                                                  |
| `npm run content:check`   | Validate profile, collections, CMS parity, media paths and PDF signature           |
| `npm run test:cms`        | Six isolated edit/build/restore/invalid-content workflows                          |
| `npm run test:analytics`  | Consent, mock vendor failure and analytics resilience browser suite                |
| `npm run test:lighthouse` | Mobile and desktop local-candidate audits, all categories ≥95                      |
| `npm run test:unit`       | Configuration, schema, publication, and token checks                               |
| `npm run test:e2e`        | Browser, keyboard, accessibility, and responsive checks                            |
| `npm run test:base`       | Verify a GitHub Pages project-path build                                           |
| `npm run build`           | Generate and verify static pages, rendered primitives and asset budgets in `dist/` |
| `npm run preview`         | Serve the generated site locally                                                   |
| `npm run audit`           | Fail on high or critical dependency vulnerabilities                                |
| `npm run validate`        | Run the complete local quality pipeline                                            |

Build before running browser tests independently. Browser results and screenshots are generated evidence, not source assets. `npm ci` requires registry access on a clean machine; dependency audit also requires access to the npm advisory service. A failed or unavailable advisory request is not a clean security result.

## Design system

The approved desktop/mobile reference governs the white/ice-blue canvas, navy type, blue gradients, rounded translucent surfaces, restrained shadows, Alpine imagery, and page composition. Values are coherent approximations, not a claim of pixel-perfect extraction. The full interface preserves that visual direction while keeping missing professional information explicit.

`src/styles/tokens.css` is the design authority. Semantic tokens govern backgrounds and surfaces, readable text, brand colors, borders, focus, interaction states, gradients, shadows, spacing, fluid type, layout width, radii, control sizes, motion, and stacking. Extend these tokens before adding component-specific values. Keep text and control contrast separate from decorative blues. Components inherit their styles from this shared authority.

Inter provides the self-hosted typographic foundation; Caveat supplies the restrained handwritten accent from the approved reference. Fluid type and gutters adapt between compact mobile and large desktop. The layout uses content-driven grids and a mobile navigation pattern; it does not scale a fixed desktop canvas down. CSS motion is restrained and respects reduced-motion preferences. Keyboard focus remains visible, and controls use touch-friendly targets.

## Content and assets

`src/data/profile.json` holds singleton profile content and is validated by `src/data/profile.ts`. Repeated editorial records live in JSON files under `src/content/`, loaded through `src/content.config.ts`; `src/lib/content.ts` owns schemas, stable identifiers, ordering, publication controls, and reference checks. The architecture covers site identity, hero, highlights, expertise, skills, case studies, experience, education, languages, about, contact, CV, and SEO. Pages CMS edits these ordinary repository files through `.pages.yml`; `npm run content:check` validates all schemas, references, media and documents before every production build.

Professional claims must come from owner-provided information or the owner's verified professional profile. Unverified fields remain empty. Source-backed records use the existing publication controls and typed Content Collections; design demonstrations remain separate and are identified when no published record exists. Skill indicators do not imply certified proficiency when the source provides no level. Dates, employers, project descriptions, and metrics must retain the precision and limits of their source. Do not infer claims from the reference artwork, turn missing values into zero, or publish examples as real experience.

Task 2 professional content was checked against [Konstantin Arutjunov's LinkedIn profile](https://www.linkedin.com/in/konstantin-arutjunov/) and its Featured CV in Opera on **2026-10-23**. Only public professional information relevant to this portfolio is retained: role and career history, education, listed skills, project descriptions, and professional contact details. The owner confirmed the approximately 2 hours to 3 minutes loan-processing improvement during this task. That metric and the approximately 65% to 90% insurance-coverage improvement retain their reported precision and measurement limitations; the source does not publish a measurement method or period. The external-bank-statements case does not imply an unreported quantified outcome. Skills have no inferred proficiency ratings, languages remain unpopulated, and no unsupported successful-project count is presented.

The owner separately confirmed experience with Google Cloud Services, RPA automation, ChatGPT, Copilot, and Codex during this task. These items are owner-provided information, not attributed to the LinkedIn profile. They carry no inferred duration, certification, proficiency score, or unsupported project result.

The original portrait, approved logo, a current downloadable CV PDF and final asset/content approval remain external dependencies. Email and LinkedIn are confirmed; language proficiency is intentionally unpopulated. A real external CV preview is available through LinkedIn. Reference-derived generated imagery is explicitly development material, not a verified photograph of the owner, a client, or a delivered project. Replace it with approved originals before launch. The reference image is not shipped as the page UI, and screenshot crops are not treated as high-quality source assets.

CV controls use a local PDF download only when validated local CV metadata is available. Until then, **View CV** opens the [actual Featured CV viewer](https://www.linkedin.com/in/konstantin-arutjunov/overlay/1753005451683/single-media-viewer/?profileId=ACoAABmyyD0B2egZyOVt5zRFatDd-ssMM7VpIxA) in a new tab; it does not pretend to download a file. If neither source is present, the control falls back to a disabled **CV pending** state. `cvPreviewUrl` is a backwards-compatible optional profile field that defaults to `null`. The language disclosure identifies English as the only available language and explicitly states that other translations are unavailable. Professional contact links use the verified email and LinkedIn profile.

Store source images in `src/assets/` and use Astro image optimization for responsive dimensions, suitable formats, and stable aspect ratios. Only files intended to be copied unchanged belong in `public/`, such as vetted documents and icons. Keep alt text tied to image meaning; use empty alt text for purely decorative images. Noncritical images should load lazily; only a genuine above-the-fold critical image should receive eager loading and fetch priority. Do not add unrelated stock substitutes.

Font files are self-hosted with their redistribution license retained. Lucide icons render as SVG with accessible naming handled by the containing control or icon wrapper. Avoid external font services and entire icon sets in client JavaScript.

The preview uses Lucide’s Feather as a temporary library mark. It is not the approved FOLIO logo artwork. Both fonts use the SIL Open Font License, retained under `public/fonts/`; the Lucide license is retained under `public/icons/`.

To replace the temporary portrait in Pages CMS, open **02 · Images & branding**, upload/select the new portrait, write accurate alt text, and turn off **Temporary portrait**. Save and check GitHub Quality. The shared `src/data/media.json` source updates Hero and About together; no code change or filename convention is required. Local maintenance can still replace `src/assets/portrait.png`. Uploaded images remain Astro-optimized raster sources; arbitrary SVG and remote uploads are excluded.

The decorative Caveat font is subset to the fixed signature words **Ideas, Analysis, Solutions, Impact** in `src/assets/fonts/caveat-signature.woff2` (9,228 bytes), preserving the combined font budget. If those words change, regenerate the subset from the locked `@fontsource/caveat` source with FontTools, include the new glyphs, retain the OFL license, and rerun the static font budget check. FontTools is a build-maintenance utility only and is not an application or deployed runtime dependency.

## URLs, SEO, and GitHub Pages

`src/config/site.ts` owns site presentation and navigation; `src/config/deployment.ts` owns URL configuration. `SITE_URL` is the verified HTTPS origin; `BASE_PATH` is the deployment path (`/` for a root domain, `/folio/` for this project site). The same configuration governs links, static assets, canonical URLs, social metadata, robots, and sitemap output. No domain is guessed when the origin is absent. Person JSON-LD uses only supplied profile facts. `SITE_INDEXABLE` defaults to false while original assets and professional content are pending. A configured origin produces a sitemap; robots disallows crawling until the explicit launch flag is true. Canonical and OpenGraph URLs are omitted when the origin is unknown, and the 404 never receives a canonical URL. Configuring an origin alone does not turn this preview into launch-ready portfolio content.

```sh
# Local candidate for the intended GitHub project URL; this does not publish it.
SITE_URL=https://amarok90.github.io BASE_PATH=/folio/ npm run build
BASE_PATH=/folio/ npm run preview
```

The `Quality` workflow runs on pushes and pull requests with read-only repository access. It uses the lockfile and gates checks, lint, formatting, meaningful tests, dependency audit, a project-path check, the static build, and real Chromium checks. A failure stops the job. Branch protection must be configured in GitHub to require this status; the workflow does not bypass protections.

`Pages readiness (manual)` is dispatch-only. It takes explicit HTTPS `site_origin` and `base_path` inputs, validates again, and uploads `dist/`. Defaults are `https://amarok90.github.io` and `/folio/`; the origin never includes the repository path. Repository variables control `SITE_INDEXABLE`, `CLARITY_ENABLED` and `CLARITY_PROJECT_ID`, all safely disabled when absent. Publication defaults to **false**. Explicit publication is restricted to the default branch; only the deploy job receives Pages write and OIDC permissions. Local checks do not prove that a remote workflow or deployment has run.

Remaining GitHub setup:

1. Inspect the **Quality** run for the current commit; local results do not substitute for the GitHub run.
2. Resolve Pages eligibility first: on 2026-10-23 GitHub displayed **“Upgrade or make this repository public to enable Pages”** for this private repository. Visibility/plan changes require the owner’s decision. Once eligible, select **Settings → Pages → Build and deployment → GitHub Actions**. This workflow deliberately does not enable Pages or alter repository settings automatically.
3. Require the quality status through the repository’s branch protection/ruleset. Configure the `github-pages` environment if deployment reviewers or branch restrictions are desired.
4. Run the manual Pages workflow with publication disabled to validate the artifact. Final content, domain/DNS, HTTPS verification, and an intentional public deployment belong to Task 4.

For a future custom domain, configure that domain and DNS in GitHub Pages first. Run the manual workflow with that HTTPS origin and `/` base path; verify canonical, sitemap, asset links and HTTPS before publication.

Official GitHub actions are pinned to full commit SHAs verified against their releases: [checkout](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-node](https://github.com/actions/setup-node/releases/tag/v7.1.0), [configure-pages](https://github.com/actions/configure-pages/releases/tag/v6.0.0), [upload-pages-artifact](https://github.com/actions/upload-pages-artifact/releases/tag/v5.0.0), and [deploy-pages](https://github.com/actions/deploy-pages/releases/tag/v5.0.1). Review upstream releases and update the pin plus its version comment together; rerun the gates after updates.

## Security and certification boundaries

Only generated static output is deployable. Keep credentials, private documents, `.env` files, and local artifacts out of source control and `public/`. No runtime secrets, forms backend or dynamic HTML injection are needed. The optional Clarity Project ID is a public identifier, not a secret; do not put credentials into content or workflow variables. External links must have a meaningful accessible name and use appropriate safe link attributes when opening a new tab.

Automated accessibility checks support WCAG 2.2 AA work; they do not certify the complete final site. Browser tests cover 320, 375, 390, 480, 600, 768, 900, 1024, 1180, 1280, 1440, and 1920 px layouts; menu and tab keyboard behavior; project/contact/language disclosures; reduced motion; no-JavaScript navigation; responsive image loading; and missing-content safety. E2E checks use Chromium in CI. Actual Opera screenshot and interaction inspection is a separate verification requirement; passing Chromium tests alone does not prove Opera visual review.

Set `FOLIO_SCREENSHOT_DIR` to an existing absolute output directory when running E2E checks to capture full-page and viewport evidence at 320, 390, 768, 1024, 1440, and 1920 px. Screenshots are local generated evidence and are not shipped in the site. The static verifier checks every HTML page, local asset and responsive `srcset`, all section anchors, project-path compatibility, non-indexable metadata, no hydration/server leaks, and payload budgets. Lighthouse audits an isolated indexable local candidate at `/folio/`, with gzip text delivery and a conservative 10-minute asset cache. Real-host encoding/cache, field Core Web Vitals, final assets and public-launch certification must be verified in Task 4. Local reports are not evidence of production traffic or deployment.

The three-page output (portfolio, privacy and 404) has bounded budgets of **68,000 bytes CSS**, **14,000 bytes gzip CSS**, **12,000 bytes aggregate client JavaScript**, and **70,000 bytes WOFF2 fonts**. Task 3 adds real consent/privacy behavior: the candidate measured 64,167 CSS bytes, 11,845 gzip CSS bytes, 10,360 aggregate JavaScript bytes and 57,484 font bytes. Aggregate JavaScript counts repeated inline navigation per HTML page, not just a single-page transfer. Budgets protect the approved composition and required behavior; gzip is an estimate until hosting is checked.

## Pages CMS owner workflow

`.pages.yml` offers nine editors: Profile/contact/CV/SEO, Images/branding, Highlights, Expertise categories, Skills, Case studies, Career, Education, and Languages. Editable data has a single source of truth; `src/lib/content.ts` owns runtime validation and the CMS/config parity check prevents field drift.

1. Authorize Pages CMS against this existing repository in Task 4. Edit in its interface and save a Git commit. CMS saves source; it does not bypass Quality or publish this site automatically.
2. Use ordinary labels and help text. Records require stable lowercase IDs. Lower **Display order** values appear first. A record appears only when **Published** and **Show on website** are both selected; a new record defaults to draft/hidden. Keep the required public profile published.
3. Add an expertise category first, then copy its stable ID into related skills. JSON-list editors do not support the collection-backed dynamic reference dropdown; validation rejects unknown IDs. Do not rename an already referenced ID without updating its references.
4. Upload PNG/JPEG/WebP/AVIF files through **Website images**, select the file, and add meaningful alt text. Decorative Alpine/contact images use empty rendered alt text intentionally. Project images retain their own paths when records reorder. Mark illustrations honestly. Optional logo, sharing image, project image and PDF fields may be cleared; partially filled invalid data fails the build.
5. Upload the current PDF through **Public CV documents**, then fill the profile’s **CV PDF** path, title, filename and accessible link label. Paths resolve under `/documents/`; file existence and PDF signature are checked. Buttons become genuine downloads with the configured filename. Clear PDF metadata to restore the real external View CV action. Uploading a document alone does not select it.
6. Review the Quality run. If a save was wrong, use GitHub’s file history and revert the content commit; run Quality again. History and restore are Git-backed, not browser storage.

`npm run test:cms` makes isolated temporary repository copies, changes text/media/PDF/project order, builds real static output, restores byte-identical source, and proves invalid data blocks output. The six local workflows do not prove authenticated live CMS saving or authorization. No test fixtures or PDFs are published. Live authorization/save/rollback are **READY FOR TASK 4**.

## Optional analytics and privacy

`CLARITY_ENABLED=true` plus a valid `CLARITY_PROJECT_ID` is required at build time. Without both, no vendor script loads and preferences explain that optional analytics is disabled. Clarity is not activated in the current candidate.

With valid configuration, the banner presents equally clear Accept/Reject actions and a native keyboard-accessible preference dialog. Only a valid, unexpired acceptance for the current project can inject the script. Consent lasts up to 180 days; project changes invalidate it. `consentv2` grants analytics storage only after acceptance and always denies advertising storage. Footer and Privacy Policy reopen preferences. Withdrawal signals denial, clears accessible Clarity cookies, removes the script and reloads the page to stop an active recorder; storage failures and cross-tab revocation fail safely.

Custom events are an allowlist of names only: `cv_view`, `cv_download`, `linkedin_click`, `email_click`, `explore_work`, `contact_cta`. No URL, email, CV contents or arbitrary payload is sent as an event. The page body is masked; startup URLs with queries/unknown fragments or unsafe referrers suppress analytics. This does not claim that a session recorder can collect no technical metadata. The Privacy Policy describes its actual scope and Microsoft’s processing limitations. Task 4 must review project masking, consent settings, retention and live network/session behavior.

`npm run test:analytics` uses an isolated configured build and intercepted local vendor stubs/blocked responses. It proves no pre-consent requests, reject/change/withdrawal, duplicate prevention, storage/vendor failures and independent core behavior. It sends no test recordings to Microsoft and is not live Clarity certification.

See [TASK4-HANDOFF.md](TASK4-HANDOFF.md) for launch gates and [design-qa.md](design-qa.md) for browser evidence.
