# FOLIO — Task 4 release status and owner handoff

The public website is live at [https://amarok90.github.io/folio/](https://amarok90.github.io/folio/): actual HTTP 200, valid HTTPS, thirty public E2E checks and public Lighthouse verification passed. Full **CMS-managed production certification remains pending** the live editing/upload/rollback workflows below. Microsoft Clarity is explicitly outside this release and stays disabled.

## Completed hosting configuration and future publication

1. The owner explicitly authorized making `Amarok90/folio` public and completed GitHub Mobile **Confirm access**. The repository is now public. Publication exposes source, assets and Git history as well as the website. The final pre-exposure audit of five commits and 190 unique blobs found no actual credentials or confidential files. This is scoped audit evidence, not a guarantee about every possible sensitive format. No paid plan was purchased.
2. **Settings → Pages → Build and deployment → Source** is set to **GitHub Actions**. HTTPS is enforced for the default `amarok90.github.io` domain. Preserve the `github-pages` environment and main-branch safeguards; do not bypass a failing quality gate.
3. Review the temporary portrait and illustrative images. They remain visibly identified and owner-authorized; replace them through **02 · Portrait, logo & backgrounds** whenever originals are available. Keep unconfirmed languages empty. The existing real **View CV** action opens LinkedIn's Featured document and may require a LinkedIn session. Local CV candidates were located on Desktop during the extended audit; the current approved public PDF remains pending because these files need privacy/content reconciliation. Do not publish a synthetic CV to satisfy a test. The technical Design preview banner appears only in non-indexable candidates; release builds retain the truthful per-image labels.
4. Set repository variables `SITE_ORIGIN=https://amarok90.github.io` and `SITE_BASE_PATH=/folio/` only if overriding the identical workflow defaults. Production builds default to indexable; set `SITE_INDEXABLE=false` to defer indexing while content is being reviewed. Local `make` candidates always stay noindex. Review the launch artifact and its intended robots policy.
5. **`PAGES_DEPLOY_ENABLED=true`** is now saved. The first actual release ran **Pages production** on `main` with `publish=true`, origin `https://amarok90.github.io`, base `/folio/`. [Run 39938621033](https://github.com/Amarok90/folio/actions/runs/39938621033) successfully built and deployed commit `0faa923fd76f0ca8e8eb399699ea99cac5292fa6`. A future manual run with `publish=false` validates and uploads an artifact without publishing.
6. Thereafter each push to `main`, including CMS commits, runs the full quality pipeline and publishes the same verified `dist/` artifact. The deploy job depends on the successful build, has isolated Pages/OIDC permissions, rejects a stale main commit and shares a cancelable deployment concurrency group. Failed validation never reaches publication. The separate Quality workflow also validates pushes and pull requests.
7. Public verification passed: intended HTML over valid HTTPS, `/folio/privacy/`, 404 recovery, assets, anchors, CV destinations, metadata, JSON-LD, robots and sitemap. Thirty live E2E checks passed. Public Lighthouse was mobile **98/100/100/100**, desktop **100/100/100/100**; native Opera desktop/tablet/mobile and supplemental Safari desktop were inspected. Repeat affected checks after subsequent changes. A green artifact build or skipped deploy alone is not evidence that a new version is live.

For a future `.com`, configure the custom domain/DNS and HTTPS in GitHub Pages, then set `SITE_ORIGIN` to the new HTTPS origin and `SITE_BASE_PATH=/`. The same centralized URL authority produces every deployment URL; components need no migration.

## Pages CMS owner access and routine edits

Open [Pages CMS](https://app.pagescms.org/). The owner accepted its Terms/Privacy Policy and confirmed GitHub App account authorization. Repository installation is prepared with **Only select repositories → Amarok90/folio**; confirmation of the displayed installation permissions is still pending. No other existing repository is selected. After installation, select `Amarok90/folio` and production branch `main`. The root `.pages.yml` supplies ten labeled editors:

- **Profile, contact, CV & SEO**: professional introduction, biography, availability, approved contact channels, PDF metadata and search/social metadata.
- **Images & branding**: shared Hero/About portrait, alt text, temporary flag, Alpine/contact imagery, optional logo and social image.
- **Highlights**, **Expertise categories**, **Skills**, **Case studies**, **Career**, **Education**, **Languages**: repeated professional records, stable IDs, ordering, publication and visibility.
- **10 · Website wording, navigation & buttons**: section headings/intros, navigation labels/order, supported anchor destinations, CTAs, CV action labels and footer wording.

Lower **Display order** appears first. New records default to draft/hidden; both publication controls must allow a record before it appears. Do not change a referenced ID without updating its references. Add an expertise category before using its ID in skills. Keep professional facts source-backed and proficiency levels unpopulated unless actually assessed.

Upload raster images through **Website images**, select their path and give meaningful alt text. Shared portrait changes update Hero and About together. The build validates media files and Astro produces responsive optimized output. Project images follow their record when ordering changes. Clear optional image fields together when removing an asset; file and cross-field validation prevent broken output.

Upload the owner's approved current PDF through **Public CV documents**, then set the profile's **CV PDF** path, title, download filename and accessible label. Uploading alone does not select it. The build checks path, existence and PDF signature; controls become genuine downloads. Clear PDF metadata to restore the actual external **View CV** action. A genuine updated two-page CV review candidate is saved outside Git under `artifacts/task4/cv-review/`; it uses verified profile facts and only the approved email/LinkedIn contacts. It is not yet approved or published. Preserve the owner-confirmed loan metric of approximately 2 hours → 3 minutes when replacing documents.

Save through CMS, inspect GitHub Actions for that exact commit, and wait for successful deployment before checking the public result. CMS writes ordinary versioned files; it cannot bypass content validation or deployment gates. Privacy/consent policy and accessibility operating instructions remain code-governed so routine marketing edits cannot assert unsupported legal or language functionality.

## Mandatory live CMS acceptance — still pending

Local integration tests use isolated copies and actual builds. They are **not** authenticated live CMS evidence. After the owner signs in and hosting is active:

1. Edit a short sentence through CMS → save → inspect the Git commit → successful CI/build/deploy → verify changed text on the public HTTPS page.
2. Upload/select an approved replacement image, update alt text and verify the actual optimized image and stable responsive composition publicly. Restore the intended asset afterward.
3. Upload/select the real current owner PDF and verify public PDF bytes, MIME type, URL, filename and download behavior. This cannot be certified with a fake CV.
4. Change a project order and label, verify card/details/image coherence on the public site, then restore the intended ordering.
5. Revert the temporary edit commit using GitHub history or a normal Git revert; verify successful CI/deploy and restored public content. Preserve history, do not reset or force-push.
6. On a nonproduction review branch, attempt invalid required/URL/date/reference/media data. CMS validates supported fields and the build must reject unsafe or inconsistent content. Confirm no deployment occurred and the last healthy public site remains available. Restore valid source before merging.

Keep dated commit/run/deployment URLs and public screenshots for every step. Complete local workflows and a healthy public URL alone do not satisfy this live chain.

## Local commands and verification

With Node 24 and locked dependencies installed (`nvm use`, `npm ci`), use:

```sh
make folio.run      # foreground dev, prints http://127.0.0.1:4321/folio/
make folio.check    # complete quality pipeline, including real browser checks
make folio.build    # validated static /folio/ build
make folio.preview  # rebuild, then foreground static /folio/ preview
```

The launcher finds an already installed compatible Node via the current runtime, nvm or Homebrew. `FOLIO_NODE=/absolute/path/to/node` selects one explicitly; `FOLIO_PORT=4328` changes the local serving port. It installs nothing automatically, keeps Clarity disabled and prints actionable errors. Stop serving commands with Ctrl+C before a build/check shares the Astro workspace cache. Install Playwright Chromium once with `npx playwright install chromium`, or on this Mac use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' make folio.check`. Browser installation/audit needs network access.

The four commands are tested on the owner's macOS. Native Opera inspection and screenshots are independent from Chromium E2E. Local Lighthouse audits use an isolated indexable candidate with gzip text and a 10-minute static cache. They do not establish live host caching, public scores or field Core Web Vitals.

## Production verification and recovery

After each relevant release, repeat all nine sections and interactions in actual Opera at desktop/tablet/mobile widths, including 320px. The first public release passed this inspection and thirty automated live checks. Check keyboard menu/Escape, tabs, project/role disclosures, CV, email/LinkedIn, privacy preferences, reduced motion, images and overflow. Supplement with available Safari/Chrome; report only actual browser coverage. Run axe and Lighthouse against the real public page, targeting at least 95 in all four categories. Field Core Web Vitals require traffic and time.

Clarity remains hard-disabled in both release workflows (`CLARITY_ENABLED=false`, empty project ID), irrespective of repository variables. No vendor script, event, recording or heatmap is expected or certified. Preserved consent/privacy functionality and isolated mock tests support a separately authorized future integration; do not activate it as part of this release.

For recovery, use a normal revert of the offending source/content commit, wait for the full quality gates, and let the enabled main workflow deploy the resulting verified artifact. A validation failure leaves the previous Pages deployment intact. `PAGES_DEPLOY_ENABLED=false` pauses subsequent publication while diagnosis proceeds; it does not remove an existing deployment. Local byte-identical restoration is tested; actual public rollback remains pending the live CMS acceptance above.

See [design-qa.md](design-qa.md) for dated verification evidence and honest coverage boundaries.
