# FOLIO Task 4 — release verification, 2026-10-23

**Local candidate: PASS. Public launch: BLOCKED / PENDING OWNER ACTION.** The actual target `https://amarok90.github.io/folio/` returns HTTPS 404. GitHub Settings → Pages says **“Upgrade or make this repository public to enable Pages.”** The repository remains private. Pages CMS redirects to sign-in and requires owner acceptance/authorization. No successful public deployment, live CMS publishing, public rollback or production Lighthouse score is claimed. Clarity remains disabled and is outside this release.

## Changes and root causes

Task 3 left section headings, navigation wording and button labels embedded in components, despite the complete owner-editing requirement. A tenth Pages CMS editor now writes validated `src/data/interface.json`; components consume that canonical source. Safe section targets and actual PDF/view semantics remain enforced. All nine sections retain their approved defaults and professional facts.

Explicit CMS skill proficiency previously disappeared during rendering; it now appears as text only when supplied, with truthful missing/mixed notes. Custom signature words use the complete primary font rather than the fixed Caveat glyph subset. Long valid navigation labels wrap. Measured sticky-header height controls anchor spacing, including after menu closure, and unenhanced navigation remains static so it cannot cover content. A stronger boundary test exposed the partly hidden eyebrow at 900px; the final test verifies the entire section introduction below the header. Contact email can break naturally before `@` without changing its link or accessible name.

`Makefile` and the small runtime launcher provide the four requested commands using installed Node 24. Both serving commands stay foreground, print the correct `/folio/` URL and stop with Ctrl+C. Real HTTP requests verified pages, twelve referenced assets and correct MIME types. No runtime installation or background infrastructure was introduced.

The Pages production workflow validates every main push before uploading the exact static artifact. Publication additionally requires `PAGES_DEPLOY_ENABLED=true`, the main branch and a current-commit check. Permissions are isolated, official actions remain pinned, and failed validation cannot publish. The deployment flag remains off while hosting eligibility needs the owner's visibility decision. Production forces Clarity off regardless of repository variables.

## Final automated evidence

The final frozen `make folio.check` passed with no retries: Astro/TypeScript **62 files, zero errors/warnings/hints**, ESLint, Prettier, **120 unit tests**, **7 isolated CMS workflows**, **34 base-path + 34 main E2E tests**, **19 intercepted analytics-resilience tests**, all static build checks and npm audit **0 vulnerabilities**. One earlier run correctly failed the centralized-token invariant for the new measured header variable; added its canonical token default and reran the entire pipeline. No test or budget was weakened.

CMS workflows build real isolated static output for text and UI wording/CTA edits, image/logo replacement, a genuine temporary PDF fixture, project ordering, exact rollback, invalid input rejection and explicit/missing proficiency. Fixtures are restored and never published. Four additional browser cases exercise maximum-length brand, navigation and CV labels at 320/900/1024/1440. These local contracts do not substitute for authenticated CMS operations.

Final budgets: **65,331 bytes CSS**, **12,031 bytes gzip CSS**, **10,813 aggregate client JavaScript bytes**, **57,484 font bytes**, three static HTML pages. Local Lighthouse: mobile **99/100/100/100**, desktop **100/100/100/100** (Performance/Accessibility/Best Practices/SEO). Reports use the documented isolated indexable candidate, gzip text and a ten-minute asset cache. Live scores and field Core Web Vitals remain unmeasured because the public site is unavailable.

Security review covered the existing **3 commits / 149 unique blobs**, Git integrity and **102 current tracked/planned source files**. No actual credentials, private keys or confidential documents were found; six historical pattern matches were synthetic unsafe-URL rejection fixtures. Reviewed image metadata and SVGs revealed no GPS/EXIF payload or active SVG content. This is scoped audit evidence, not a guarantee about all conceivable secrets. Ignored screenshots, test documents and local artifacts do not enter Git or the deployment artifact.

## Actual browser evidence

Current native screenshots are saved and inspected under `artifacts/task4/screenshots/`; automated width/full-page evidence is under `artifacts/task4/automated-screenshots/`. Native Opera captures include browser/DevTools chrome; toolbar dimensions explicitly identify CSS width, 844px height and Fit to window. The white/ice-blue/navy composition, gradient controls, Alpine imagery and section hierarchy remain consistent with the approved reference. There is no claim of pixel-perfect extraction or physical-device coverage.

- `01-public-url-404.png`, `02-pages-cms-sign-in.png`, `03-github-pages-eligibility.png`: actual external blockers, with no settings/authentication changes.
- `08-opera-desktop-1440.png`, `09-opera-desktop-expertise.png`, `10-opera-desktop-journey.png`, `11-opera-desktop-about.png`: header/hero/highlights, real technical skill switching, arrow-key tabs, timeline and About composition. The Opera console shows no application errors.
- `12-opera-tablet-768.png`, `13-opera-tablet-projects.png`, `14-opera-tablet-detail.png`: tablet composition, menu destination/closure and meaningful project challenge/contribution/limitations.
- `07-opera-mobile-320.png`, `15-opera-mobile-390.png`, `16-opera-mobile-menu.png`, `17-opera-mobile-contact.png`, `19-opera-mobile-footer.png`: compact layouts, menu/Escape/focus, keyboard Contact navigation and readable approved contact channels.
- `18-opera-mobile-privacy.png`: centered, readable preferences; optional analytics explicitly disabled, unavailable choices disabled, Escape closes the dialog. Production Clarity was never enabled to obtain this evidence.
- `20-opera-real-cv.png`: clicking the site's actual View CV opens **CV Konstantin Arutjunov.pdf** in the real LinkedIn viewer. It is an external view, not a fabricated local download.
- `04-safari-desktop.png`, `05-safari-project-detail.png`, `06-safari-privacy.png`: actual Safari desktop supplement; inspected rendering, anchor navigation, technical tab switching, project disclosure and preference/Escape behavior. This is not a complete Safari/device matrix.

Automated axe and responsive checks cover 320–1920px, including intermediate widths, navigation without JavaScript, focus/menu/tabs/disclosures, media and privacy. They support the WCAG 2.2 AA target without asserting exhaustive screen-reader certification. Full live Opera, live Lighthouse, CMS text/image/current-PDF/order/save/deploy/rollback and public HTTPS checks remain pending hosting and owner sign-in. The original portrait/logo and current local PDF remain disclosed dependencies; no substitutes were presented as verified personal assets.

The exact owner procedure and recovery steps are in [TASK4-HANDOFF.md](TASK4-HANDOFF.md). GitHub run links and the actual commit are reported after push; a successful artifact workflow with a skipped deployment is not LIVE PASS.

---

# FOLIO Task 3 — production-candidate verification

Task 3 local gates are PASS; authenticated CMS, live Clarity and public hosting verification are READY FOR TASK 4. GitHub Pages eligibility is externally BLOCKED for the current private repository/plan. No public deployment was performed. The Task 2 visual audit is retained below as historical design evidence.

## Scope, authority and remediation

Preserved the Astro static architecture, approved visual language, all nine page regions and verified professional facts. `.pages.yml` edits typed JSON sources; no backend or duplicate content authority was introduced. Media uploads resolve through Astro’s optimized raster pipeline, not executable uploaded SVG/HTML. Optional CMS fields normalize cleared inputs honestly; publication/reference/file validation fails closed.

Actual defects resolved during Task 3: partially cleared CMS image objects; mixed-case raster upload contract; nullable privacy email rendering; image/order coupling; missing PDF/file validation; privacy dialog positioned at the corner by the CSS reset; the LinkedIn CV viewer’s missing `profileId` parameter; and missing word spacing around conditional privacy text. The latter was proven by comparing the empty shortened viewer with the already opened complete source URL displaying **CV Konstantin Arutjunov.pdf**. The confirmed website metric remains ≈2 hours → 3 minutes; the older CV has a different measurement and must be synchronized by the owner before launch.

Lighthouse first measured mobile Performance 92. The landscape was the real LCP image, the portrait sizes hint fetched excess pixels, and the uncompressed local fixture distorted delivery cost. Fixed image priority/sizes/compression and made the local static audit explicitly use gzip text plus a 10-minute asset cache. Final local candidate: mobile **99/100/100/100**, desktop **100/100/100/100** (Performance/Accessibility/Best Practices/SEO). These are actual Lighthouse reports, not field Core Web Vitals or a GitHub-hosted score.

## Automated evidence

The complete sequential `npm run validate` passed: strict Astro/TypeScript (57 files, zero diagnostics), ESLint, Prettier, **105 unit tests**, **6 CMS integration workflows**, dependency audit (**0 vulnerabilities**), root static build, **30 root E2E**, **30 `/folio/` E2E**, **19 configured consent/analytics E2E**, and both Lighthouse audits. A local preview initially occupied the base-suite port; stopped that task daemon and reran the pipeline. No gate was bypassed. The empty language collection is intentional; Astro logs its missing-items warning rather than inventing languages.

CMS integration changes isolated source copies and builds real HTML/assets: text edit, mixed-case image/logo replacement, actual PDF signature and download filename/path, project text/image/order, byte-identical rollback, and invalid data refusing successful output. It also verifies cleared email falls back to the approved LinkedIn channel. No live Pages CMS authentication/save/upload/rollback is implied.

Automated browser coverage includes 12 widths from 320 to 1920, no overflow/clipped controls, keyboard/menu/tab/disclosure behavior, reduced motion, no-JavaScript navigation, CV/contact semantics, privacy metadata and axe WCAG 2.2 AA rules. Dialog centering is regression-checked at 320/390/768/1440. This supports the AA target without claiming exhaustive assistive-technology certification.

## Actual Opera evidence

Evidence is local and ignored under `/Users/konstantin.arutjunov/Projects/Folio/artifacts/task3/`; it is not included in the site artifact. Native screenshots contain Opera/DevTools chrome, with explicit responsive CSS dimensions and Fit to window. Visual judgments exclude the browser chrome and emulation scale.

- `screenshots/opera-desktop-1440.png`, `opera-desktop-expertise-projects.png`, `opera-desktop-journey.png`: static `/folio/` header/hero/highlights, real expertise content switching, project imagery and timeline. The approved navy/ice-blue/gradient/Alpine composition remains intact.
- `screenshots/opera-tablet-consent-banner.png`, `opera-tablet-project-details.png`: 768px composition, equal Accept/Reject clarity and meaningful project contribution/limitations.
- `screenshots/opera-tablet-preferences-rejected.png`, `opera-tablet-preferences-accepted.png`: centered preference dialog and real state changes. Rejection made no vendor calls; acceptance produced consentv2 analytics granted/advertising denied, one `explore_work` event, then withdrawal produced denial and page reload.
- `screenshots/opera-mobile-390-top.png`, `opera-mobile-menu.png`, `opera-mobile-blocked-analytics.png`: mobile composition, touch-style menu activation and Escape close, keyboard consent activation and graceful optional-script failure.
- `screenshots/github-pages-eligibility.png`: actual settings prerequisite. No repository visibility/plan changes were made.

The configured Opera fixture serves the real compiled candidate but rewrites ONLY its vendor endpoint to a local stub; blocked mode returns 503. Its call log is `fixtures/clarity-calls.jsonl`. No Microsoft recording or fake Project ID traffic was sent externally. The expected blocked-script network error and a sub-50ms DevTools reflow advisory are distinguished from an application exception. Core actions remained usable. Live vendor behavior, dashboard events/recordings and heatmaps remain Task 4.

Lighthouse reports are `lighthouse/mobile.report.html` and `desktop.report.html`; the complete pipeline log is `validation-final.log`. `screenshots/opera-mobile-privacy.png` and `opera-cv-viewer-repaired.png` record the final policy and repaired external document viewer. Source, optimized images and CMS-backed content render correctly; temporary portrait/illustrative labels remain deliberate owner-approved preview content.

## Boundaries and handoff

No original portrait/logo or current local PDF was fabricated. PDF replacement/download is locally verified with a temporary document and restored; current controls use the real LinkedIn CV viewer. The external viewer can require LinkedIn access. CMS authorization and live saves need the owner’s GitHub account. Clarity is disabled in the candidate until actual configuration and consent review. Indexing remains off until content approval and intentional Task 4 launch.

See [TASK4-HANDOFF.md](TASK4-HANDOFF.md) for ordered hosting/HTTPS, CMS live acceptance, Clarity activation, production E2E and rollback steps. No known critical locally achievable functional defect remains after the documented remediation and regression gates.

---

# FOLIO Task 2 — design QA

final result: passed

This verdict covers the implemented Task 2 interface and authorized temporary imagery. It is not public-launch, WCAG conformance, Lighthouse, or pixel-perfect certification.

## Visual evidence and normalization

Source visual truth: `/Users/konstantin.arutjunov/Desktop/folio.png`, 1024 × 1536 pixels. Its desktop composition occupies approximately x=34…794 (760 pixels); the phone is a framed, compressed responsive illustration, not a separately specified CSS viewport.

Evidence directory: `/Users/konstantin.arutjunov/.codex/visualizations/2026/10/23/01a16713-c634-7441-b3a4-485398a30445/evidence/`.

- `comparison-desktop.png`: source desktop crop and complete implementation shown together. Implementation: `folio-1440.png`, 1440 × 3464 pixels, CSS viewport 1440 × 1000, device scale factor 1. Its 1216-pixel content region was resized to the source's 760-pixel width; aspect ratios were preserved. No claim of identical total page height: verified copy, accessible controls, disclosures and preview annotations change density.
- `comparison-hero.png`: focused source/implementation comparison of branding, type, portrait composition, gradient controls, availability and metric cards, normalized to equal content width. This comparison caught the right-edge signature crowding.
- `folio-390.png`: 390 × 7544 pixels, CSS viewport 390 × 844, scale factor 1; also inspected 320, 768, 1024 and 1920 captures. Full-page capture scrolls images into view before returning to the top, so lazy loading does not create false blank-image findings.
- Native Opera evidence: `opera-desktop-1440-top.png`, `opera-desktop-1440-projects.png`, `opera-desktop-1440-about-contact.png`, `opera-tablet-768-top.png`, `opera-tablet-768-journey.png`, `opera-mobile-390-top.png`, `opera-mobile-menu.png`, `opera-mobile-expertise.png`, `opera-mobile-projects.png`, `opera-mobile-project-detail.png`, `opera-mobile-contact.png`.

Native Opera captures are 3188 × 1874 window pixels, including browser/DevTools chrome; responsive toolbar CSS widths were explicitly 390, 768 and 1440, with height 844 and Fit to window. These are evidence of actual Opera rendering and interaction. Chrome is supplemental automated evidence; browser chrome and emulation scaling are excluded from visual fidelity judgments. Opera screenshots were inspected at the source region level; the clean supplemental captures support full-page comparison.

## Required fidelity surfaces

| Surface              | Review and result                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fonts and typography | Self-hosted Inter preserves the reference's compact navy hierarchy and clear body text. Caveat supplies the restrained handwriting. Responsive name wrapping, section headings, long roles, small labels and keyboard focus were inspected. The reference does not identify exact font files; these are documented approximations.                                                                                                        |
| Spacing and layout   | The shared 1216-pixel frame, ice-blue gutters, white rounded sections, sidebar/content grids, overlapping highlights, three project cards and timeline preserve the composition. Mobile reorders the portrait/CTAs, stacks content and uses horizontal tab navigation. Timeline whitespace was reduced after full-view comparison.                                                                                                        |
| Colors and tokens    | White, ice blue, navy and restrained blue gradients remain recognizable. Semantic tokens own the palette, controls, borders, radii, focus and shadows. Automated text contrast passes in default and expanded states.                                                                                                                                                                                                                     |
| Images and assets    | Separate Alpine imagery and a transparent temporary portrait preserve the approved direction. Responsive WebP output has stable dimensions. The owner authorized a temporary random portrait; one replacement file updates Hero and About. Case illustrations are visibly identified. Lucide supplies UI icons; the actual LinkedIn brand SVG comes from Simple Icons, with provenance recorded.                                          |
| Copy and content     | Recruiter-focused summaries connect engineering, enterprise systems and senior banking analysis. Three real cases retain source precision and disclosed limitations. Four main roles stay visible; detailed contributions and earlier experience expand on demand. Owner-confirmed cloud/RPA/AI tools supplement LinkedIn skills without invented ratings or project outcomes. Only the approved email and LinkedIn are contact channels. |

## Findings and remediation history

1. **P1 — Published projects ignored illustrative thumbnail fallbacks.** Early integrated screenshots showed empty symbolic image areas for `image: null` records. Fixed the published-state renderer to use optimized supplied thumbnails with “Illustrative image” captions. Final full-page and native Opera project captures show all three photographs.
2. **P2 — Tablet career titles lost usable width to badges.** Detected at 768 px. Added flexible heading wrapping and an earlier compact timeline layout; final automated width checks and Opera tablet timeline capture show readable titles without clipping.
3. **P1 — Contact definition-list markup and language accessible name.** Axe reported invalid `dt/dd` ownership and an EN/name mismatch. Corrected native grouping and the summary name to “Language: EN (English)”. Default and expanded accessibility checks pass.
4. **P2 — Stale CV controls despite a real CV viewer.** Centralized all controls through `CVAction`: real LinkedIn “View CV” until an actual local PDF is supplied. No fake download is exposed.
5. **P2 — Mobile signature over dark suit; desktop signature at crop edge.** Moved it into the portrait's positioning context over the light sky and inset the desktop edge. Final Opera hero captures and focused comparison show readable placement.
6. **P2 — Active navigation remained stale at the hero or near section boundaries.** The observer now tracks visible sections including Hero/highlights and selects the section nearest the activation line. Returning home clears the section state; the regression covers Projects, Experience and home.
7. **P2 — Portrait replacement left hardcoded preview labels.** Hero, About and the preview notice now all respect `media.portraitTemporary`; README describes the single-file replacement and shared metadata.
8. **P2 — Timeline density and content status.** Reduced redundant row spacing while preserving 44-pixel disclosure targets. Marked the current Udacity course “In progress”; corrected README's stale content-stage description. Final composition was reviewed again.

No actionable P0/P1/P2 visual or interaction findings remain. Original photography and final content approval are explicit dependencies, not silently fabricated assets.

## Interaction and quality evidence

Native Opera: inspected all major page regions; opened/closed mobile navigation and used an anchored destination; selected Technical & Tools and observed actual cloud/RPA/AI content; exercised tab keyboard navigation; opened a project and read its meaningful contribution/outcome/source content; closed it with Enter; opened the language disclosure and verified its honest availability message. Console inspection showed no application errors. Development-only Vite messages were visible; final static output is separately browser tested.

Automated: strict Astro/TypeScript, ESLint, Prettier, 58 unit checks, dependency audit (0 reported vulnerabilities), root/project-path static builds and 27 Chromium E2E checks passed during final refinement. Coverage includes 12 widths from 320 to 1920, no overflow/clipped controls, tabs, native disclosures, CV/contact destinations, image loading, keyboard menu/Escape/skip-link, reduced motion, no-JavaScript navigation, 404 links, and axe WCAG 2.2 AA rules. This supports the AA target; it is not an exhaustive manual assistive-technology certification.

## Expected differences and remaining dependencies

- Reference artwork's sample employers, dates, metrics and skills were replaced with verified content. No fabricated 20+ project count or proficiency scores are presented.
- The owner-approved temporary portrait, Alpine/technology illustrations, preview notice and non-indexable status remain intentional. Supply the owner's portrait and approved original vector logo before launch; illustrative assets can be reviewed independently.
- The CV opens its real LinkedIn viewer and may require LinkedIn access. A local PDF is needed for a direct download. Language proficiency remains unpopulated pending confirmation; English is the only site translation.
- The mobile site presents all three cases as readable stacked cards. It does not display nonfunctional carousel dots from the artwork.
- The final domain, CMS integration, analytics and public launch remain later-task work. No deployment or final performance score is implied.

## Implementation checklist

- [x] All nine page regions and shared design tokens implemented.
- [x] Source/full-view and focused comparisons inspected.
- [x] Desktop, tablet and mobile Opera screenshots inspected.
- [x] Real interactions, keyboard paths and automated accessibility checked.
- [x] P0/P1/P2 findings remediated and reviewed.
- [x] Photo replacement and content/asset dependencies documented.

Follow-up polish: evaluate exact logo artwork and final portrait crop when originals arrive; perform the full launch and assistive-technology review against finalized content. No additional ornamental animation is required for this interface.
