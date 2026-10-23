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
