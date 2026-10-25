# FOLIO release verification

25 October 2026. Actual Opera executable; isolated browser profiles.

The earlier visual PASS was withdrawn after owner review. The framed portrait and the subsequent faded portrait did not match the approved composition. Neither is accepted as final evidence.

## Current visual contract

- Header and Hero meet without a gap. Header has Download CV and no availability message.
- The original transparent portrait is displayed over the Alpine photograph with its original proportions. No image filter, opacity, blend mode, mask or fading is used. A hard viewing crop shows source y approximately 200–1150, before the raised hand begins near y1182. The crop ends at the Hero boundary.
- Hero offers Explore My Work, View CV in a new tab, and Download CV. On narrow screens, actions precede the portrait so they remain easy to find.
- Skills has a white surface and no decorative computer image.
- Whole project cards use native summary/details controls. Enter, Space, image clicks and expanded-body clicks are tested. Selecting text and following links must preserve normal browser behaviour.
- Career entries retain native disclosure controls; the redundant Journey CV action is removed.
- Employers, roles, dates, project outcomes and numeric achievements are preserved. Recruiter copy uses clear English and Europe-wide availability.

## Evidence

- Owner reference: `codex-clipboard-7e541fba-1b00-4fce-b982-4172f3d24fe3.png` and the later Hero composition supplied at 15:18.
- Rejected production evidence: `artifacts/diamond-release/production/`.
- Current local screenshots: `artifacts/diamond-release/final-local/{home,projects,experience,about}-{320,390,768,1024,1440,1920}.png`.
- Original portrait and About photographs remain byte-identical to the supplied files. Astro generates responsive web assets.
- Live authenticated Pages CMS previously saved Hero text and skill values 90/100 successfully. Value 101 was rejected by the real editor. Those reversible test changes are restored in this candidate.
- A newer owner-uploaded PDF and its selected CMS path were fast-forwarded from remote main before release preparation.
- Real Pages CMS upload of the 4,822,278-byte original PNG returned HTTP 413 before any commit. The same original was encoded as a full-resolution lossless WebP (860,456 bytes), with zero differences in visible pixel channels or alpha. Upload and selection through the real editor succeeded; GitHub bytes match the local file. The PNG original remains untouched. The production media reference now uses the successfully uploaded WebP.
- Native Media Save and exact alt-text restoration succeeded with the optional logo empty. No speculative change to optional-field validation was made.

Local quality gates, final screenshots, production publication and remaining live CMS media tests are tracked separately. Local fixtures are not proof of hosted CMS uploads or production publication.

Independent visual review found no P0/P1/P2 issue in the current desktop, tablet and mobile screenshots. The approximately matched composition follows the owner’s later opaque-photo and no-hands requirements; it is not claimed as an exact replica or new owner approval.

Local evidence: 187 unit tests, 10 isolated CMS integration tests, 40 project-base browser checks, 40 normal browser checks and 19 analytics/consent checks passed in Opera. Type checking, lint, formatting, dependency audit, content validation, static build and automated WCAG checks passed. Local Lighthouse: mobile performance 97, other categories 100; desktop all categories 100. The complete gate passed again after incorporating the real uploaded photo. A final CMS configuration check also passed after clarifying the retained legacy illustration.

Real portrait upload and selection published successfully in 102 and 105 seconds respectively. PDF upload and selection seven seconds apart cancelled the older publication and published the newer snapshot. These are hosted CMS/GitHub evidence, not local simulations.

The first full remote gate safely rejected an E2E assertion against the headless Chromium PDF viewer URL. The test now verifies the real click, separate popup, HTTP 200 PDF response, valid PDF bytes and actual download. Both complete 40-test browser suites pass in the supported Chromium Headless 156, and the focused CV test also passes in Opera. Production PDF behaviour was not changed.

Current result: local candidate passed; final code publication and live-host verification pending.
