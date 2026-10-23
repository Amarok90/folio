# FOLIO — Task 4 launch handoff

Task 3 prepares a static production candidate; it does not publish the site. Keep analytics and indexing disabled until the launch gates below are completed. Existing verified career facts, owner-confirmed ≈2 hours → 3 minutes improvement, approved contact channels and all nine sections remain intact.

## Release gates

| Deliverable                                                                          | Task 3 classification              | Required next action                                     |
| ------------------------------------------------------------------------------------ | ---------------------------------- | -------------------------------------------------------- |
| Typed content, Pages CMS configuration and six isolated edit/build/restore workflows | PASS locally                       | Authenticate and verify real CMS saves/history           |
| CV/media rendering and replacement paths                                             | PASS locally                       | Supply current PDF and original portrait/logo            |
| Consent and Clarity failure resilience                                               | PASS with intercepted local vendor | Activate real project and inspect live traffic/dashboard |
| Root and `/folio/` output, metadata, privacy, automated/browser checks               | PASS locally                       | Repeat against actual HTTPS host                         |
| GitHub Pages hosting eligibility                                                     | BLOCKED externally                 | Owner chooses an eligible repository visibility/plan     |
| Public launch, HTTPS and live external integrations                                  | READY FOR TASK 4 after eligibility | Follow the ordered procedure below                       |

## Hosting and HTTPS

1. Resolve the external prerequisite first. On 2026-10-23 actual GitHub **Settings → Pages** displayed **“Upgrade or make this repository public to enable Pages.”** The repository is private and Pages is unavailable on the current plan. No plan, visibility or repository permission was changed. The owner must choose an eligible option; do not silently make the repository public.
2. Once eligible, select **GitHub Actions** as the Pages source. Review the `github-pages` environment and main-branch protection/ruleset; require the Quality check. Grant only the deploy job Pages write/OIDC, retaining read-only quality permissions.
3. Approve launch content and assets before enabling indexing. Replace the temporary portrait through **Images & branding**, set its temporary flag false, select the approved logo and sharing image, and review illustrations. Confirm languages or retain the explicit missing-data state. Supply a current PDF; verify it agrees with the owner-confirmed loan metric. The old LinkedIn CV has a different measurement, so it must not silently override the confirmed website claim.
4. Run **Pages readiness (manual)** on `main` with `site_origin=https://amarok90.github.io`, `base_path=/folio/`, **publish=false**. Inspect every quality gate and the generated static artifact. Missing `CLARITY_ENABLED`/`SITE_INDEXABLE` variables default to false. This dry run does not require automatic Pages-settings mutation.
5. Set `SITE_INDEXABLE=true` only after final content/asset approval. If Clarity is not ready, leave it disabled and launch without it. Rerun the manual workflow and set **publish=true** only for the intentional Task 4 publication. Confirm deployment completion and the actual URL `https://amarok90.github.io/folio/`.
6. Verify a valid HTTPS certificate, HTTPS redirects/enforcement, `/folio/` assets, `/folio/privacy/`, 404 recovery, canonical/OG absolute URLs, Person JSON-LD, `robots.txt`, sitemap and no accidental preview/test/private files. Confirm the intended launch build is indexable; nonpublic candidates remain noindex/disallow.
7. For a future `.com`, configure DNS and the GitHub Pages custom domain, verify HTTPS, rebuild using its HTTPS origin and `/` base, and recheck every URL and redirect. Change one central origin/base pair, never hardcode replacements in components.

## Pages CMS live owner acceptance

Authenticate the owner at [Pages CMS](https://app.pagescms.org/) and authorize only the intended repository/branch. No live authentication, save, upload or publish was claimed in Task 3. `.pages.yml` is already in the repository; no backend needs provisioning.

Use a nonpublic review branch and temporary content, preserving original file bytes/commit IDs:

1. Edit a short hero sentence, save through CMS, confirm the Git commit and Quality result, then inspect the rendered artifact.
2. Upload/select a portrait or project image, edit alt text, confirm optimized rendering, stable layout and the selected image after reordering records. Replacing the shared portrait updates both Hero and About.
3. Upload a safe test PDF through **Public CV documents** and fill the profile’s PDF metadata. Confirm the exact `/folio/documents/…pdf` destination, correct MIME/PDF bytes and filename download action. Restore the real CV state afterward; the current candidate truthfully opens LinkedIn View CV.
4. Edit a case title/order, save and confirm the correct ordered card/details/image. Test draft and visibility controls. Keep stable IDs and valid category/skill references.
5. Restore the original content using GitHub file history/revert, confirm another successful Quality build and the original rendered output. Keep the edit and rollback in Git history.
6. Attempt invalid required/URL/date/reference/media data. CMS field validation should reject what it can; build-time validation must fail closed for cross-field/file rules. A saved invalid commit must never publish. Restore the prior valid commit and verify Quality again.

The local six-workflow suite makes isolated copies and real builds, including byte-identical restoration and invalid-output prevention. It is evidence for the integration contract, not authenticated live CMS behavior. Routine edits and uploads require no code changes; build/deployment settings remain release controls.

## Microsoft Clarity

- Authenticate with the owner's Microsoft account and select or create the real Clarity project for `https://amarok90.github.io/folio/`. Task 3 used a local mock only; no live project, session, recording or heatmap was verified.
- Before activation, configure the Clarity project to require cookie consent and use strict masking. Retain the site's `data-clarity-mask="true"` protection, review project access, retention and Microsoft processing/transfers, and reconcile `/privacy/` with the actual settings. Follow Microsoft's [Consent V2](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2), [cookie](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-cookies) and [privacy disclosure](https://learn.microsoft.com/en-us/clarity/setup-and-installation/privacy-disclosure) documentation.
- Set GitHub repository variables `CLARITY_PROJECT_ID` to the real public project ID and `CLARITY_ENABLED=true` only after that review. These are build settings; rebuild and explicitly publish the verified Pages artifact. Preserve `SITE_URL=https://amarok90.github.io` and `BASE_PATH=/folio/`. Never use the test ID `folio1234` for publication.
- In a clean browser profile, inspect the live Network and Storage panels before any choice and after **Reject analytics**: there must be no Clarity script, collection requests or newly created Clarity cookies. Check navigation, tabs, projects, CV, LinkedIn and email still work with rejection, JavaScript disabled and a Clarity script blocked.
- Accept analytics and verify exactly one Clarity script loads. Confirm `consentv2` signals `analytics_Storage: granted` and `ad_Storage: denied`; advertising storage must remain denied. Verify actual vendor behaviour rather than inferring it from the signal alone.
- Check each eligible action produces one named event: `cv_view`, `cv_download`, `linkedin_click`, `email_click`, `explore_work`, `contact_cta`. `cv_download` applies only when a real local PDF exists. Custom calls must contain only the fixed event name, with no email, link URL, text, custom identifier or other personal-data payload. Clarity's own technical/session telemetry is separate and must be reviewed in live traces and recordings.
- Verify Privacy preferences with keyboard, touch and mouse in Opera on desktop, tablet and mobile. Withdraw acceptance: denial must be signalled, accessible first-party `_clck`/`_clsk` cookies cleared, and the page refreshed to terminate the active recorder. Confirm no tracking resumes after reload, internal navigation or rejection in another tab. Recheck storage-denied and failed-write reset behaviour.
- Do not describe withdrawal as erasing previously collected data or third-party cookies: this site cannot delete another origin's cookies or Microsoft's existing records. Confirm the published policy and applicable data-request process describe those limits accurately.
- Verify clean and query-bearing entry URLs. The source pauses startup for query strings, unknown fragments and query-bearing referrers; this is an entry-time guard, not a guarantee that an already running vendor cannot observe later URL changes. Review any future code that changes URLs or introduces forms before enabling recording there.
- After consenting test visits, verify real events, session recordings and heatmaps in the authenticated Clarity dashboard, including masking and absence of custom personal-data payloads. Save dated evidence and distinguish this live verification from Task 3's simulated tests. Keep `CLARITY_ENABLED=false` and rebuild/redeploy if any release check fails; change the consent version when processing purposes change.

## Production verification and rollback

- Run `npm ci` with Node 24, install Playwright Chromium, then `npm run validate`. Inspect the GitHub Quality run for the exact launch commit. Local evidence never substitutes for that run.
- In actual Opera, inspect all nine sections, privacy, preferences, navigation/menu, expertise tabs, project and role disclosures, English availability, CV, LinkedIn and email. Verify desktop/tablet/mobile, keyboard/Escape/focus, reduced motion, 320–1920 widths, loaded media and zero overflow. Email verification opens the correct mail handler/destination; it does not send a message.
- Repeat automated axe checks and Lighthouse against the public HTTPS URL. Local Lighthouse uses an indexable isolated candidate, gzip text and a 10-minute asset cache: mobile 99 and desktop 100 Performance in the first passing run, Accessibility/Best Practices/SEO 100 on both. Check real host compression/cache and rerun instead of assuming equal scores. Field Core Web Vitals require real traffic and time.
- Keep dated native Opera screenshots and test/Lighthouse reports outside the published artifact. Confirm no application console errors; a deliberately blocked optional script may report a network failure while all core actions still work.
- For rollback, revert the offending content/code commit through Git, wait for Quality, and intentionally redeploy the last verified version using the same origin/base. Disable Clarity and rebuild/redeploy if vendor privacy or resilience checks fail. Do not rewrite history or bypass a failing gate.
