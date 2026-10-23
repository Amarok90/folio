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
