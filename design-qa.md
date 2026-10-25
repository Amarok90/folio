# FOLIO release verification — 25 October 2026

Public website: https://amarok90.github.io/folio/. Main branch only; no additional infrastructure or dependencies.

## Design and recruiter copy

The rejected framed and faded portraits were replaced with the supplied authentic cutout over the Alpine landscape. The viewing crop ends before the hands. No opacity, filter, image mask, blend effect, retouching or frame is applied. The original photographs remain unchanged. A full-resolution lossless WebP uploaded through the real CMS has zero differences in visible pixel channels or alpha from the original PNG.

Header and Hero meet without a gap. Header retains Download CV and omits availability text. Hero provides View CV in a separate tab and Download CV. Tablet/mobile actions precede the portrait. Skills uses a white surface without the laptop illustration. Native project and career disclosures support whole-card activation, keyboard controls and text selection. Journey omits the redundant CV action.

All public copy was reviewed for clear, friendly recruiter English and Europe-wide opportunities. Dates, employers, roles and numeric achievements were preserved. SEO correctly states 10+ years in IT. Independent visual reviews checked the reference and actual Opera screenshots from 320 to 1920px; the result is an approximate composition following the owner's later crop requirements, not a claim of pixel-identical fidelity or new owner approval.

## Confirmed CMS corrections

- CMS JSON serialization is excluded only for the ten known content files from the code formatter. Strict content, media, schema and reference validation remains mandatory.
- Tailwind scans application code and excludes content JSON. An isolated valid About edit containing `shadow` otherwise increased CSS from 66,870 to 68,509 bytes and failed the unchanged 68,000-byte budget. Excluding JSON kept the same valid text and restored 66,870 bytes. A real-build regression protects this data/code boundary.
- Real Pages CMS deletion of the last Language item produced a zero-byte file. A single collection parser recognises trim-empty files as empty lists for the seven collections. Required singleton objects, malformed nonempty JSON, missing files, invalid records, duplicate IDs and broken references still fail. All seven collections are validated before Astro can skip a failed loader.
- A real Education save exposed an optional end-month regex rejecting the existing current course. Optional end months, project HTTPS links, contact email and external CV URL now accept empty or valid values. Required patterns remain strict.
- The PDF test observes the actual new popup and HTTP PDF response, valid bytes and real download, rather than depending on unsupported headless PDF viewer navigation.

## Executed evidence

Local and full remote gates passed: typecheck, lint, format, **208 unit tests, 12 CMS integration tests, 40 project-base browser checks, 40 E2E checks and 19 analytics/consent checks**. Dependency audit found zero vulnerabilities. Automated WCAG checks passed. CSS remains 66,870 bytes, JavaScript 11,079 bytes and fonts 57,484 bytes.

Public Opera passed the full 34-test production suite and later real PDF/project checks. Headed Opera opened the three-page CV in a separate tab. Production PDF bytes matched the owner-uploaded 802,056-byte file. Actual-host Lighthouse measured mobile **99/100/100/100**, desktop **100/100/100/100**; later full CI retained these targets.

Authenticated hosted CMS saves verified Hero text, skills 90 and 100 (101 rejected), Media/photo upload and replacement, Education, Languages including empty optional values and deletion of the last item, Journey, achievements, project image upload, a hidden project, ordering and visibility, and PDF upload/replacement/view/download. Rapid consecutive saves and cancellation of older deployments were observed. The last healthy deployment remained available whenever validation failed.

All temporary records and punctuation probes were restored through the real CMS. An independent pinned-commit comparison confirmed all ten canonical CMS files equal the pre-test baseline after schema normalization. The two unreferenced test upload copies were removed after the original CV and project references were restored and publicly verified. Originals and Git history are preserved.

Full code gates: https://github.com/Amarok90/folio/actions/runs/40210951556 . Real empty-file publication: https://github.com/Amarok90/folio/actions/runs/40208598024 . Restored owner data publication: https://github.com/Amarok90/folio/actions/runs/40213997250 . Local evidence is stored under `artifacts/diamond-release/`, including production screenshots and Lighthouse reports.

## Platform limits

Hosted Pages CMS rejected the 4.6 MiB PNG with HTTP 413 before any commit. The lossless 840 KiB WebP succeeded; uploads under 2 MiB are recommended. Repository safety limits remain 12 MiB/40 million pixels for raster images and 10 MiB for PDFs.

Use sequential saves in one editor. Pages CMS sends the loaded file SHA and rejects stale writes with HTTP 409, but background revalidation and preservation of unsaved drafts across multiple tabs are not certified. There is no unified atomic multi-editor Save. Measured content publication was usually about 83–105 seconds; full gates took around 3–4.5 minutes.

These results describe executed checks and the stated limits, not a promise that every possible CMS/browser combination is flawless.
