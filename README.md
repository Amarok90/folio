# FOLIO

Static-first foundation for Konstantin Arutjunov’s professional portfolio. Task 1 delivers the technical architecture and a working design-system preview. The preview is visibly identified as development material and is not the finished portfolio. Final page sections belong to Task 2; CMS integration belongs to Task 3; public launch belongs to Task 4.

## Baseline and architecture decisions

The workspace was empty at audit: no application, package manifest, source assets, tests, workflows, or local Git history existed. There was no reusable implementation to migrate or remove. The supplied desktop/mobile design image is the visual authority, but it is not a production portrait, photograph, logo, or content source. The owner supplied the existing empty private [Amarok90/folio](https://github.com/Amarok90/folio) repository; local Git was initialized on `main` and connected to that remote. No existing repository identity or history was replaced.

Astro generates static HTML. Strict TypeScript, Tailwind CSS, centralized CSS custom properties, and reusable Astro components provide the foundation. Native browser features and a small TypeScript navigation enhancement handle interaction. React, client hydration, a backend, a database, animation libraries, analytics, and external runtime scripts are unnecessary for this scope.

This is one responsive single-page site. Components and content stay separate so the eventual nine anchored sections can reuse the same layout and design language. Build-time validation owns content truth; presentation components consume validated values.

## Local development and validation

Use the Node.js version in `.nvmrc`, then install exact locked dependencies:

```sh
nvm use
npm ci
npx playwright install chromium
npm run dev
```

On Linux CI, Playwright also needs system dependencies: `npx playwright install --with-deps chromium`.

| Command                | Purpose                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `npm run dev`          | Start the Astro development server                                                 |
| `npm run check`        | Astro and strict TypeScript validation                                             |
| `npm run lint`         | ESLint checks                                                                      |
| `npm run format`       | Apply Prettier formatting                                                          |
| `npm run format:check` | Verify formatting without changes                                                  |
| `npm run test:unit`    | Configuration, schema, publication, and token checks                               |
| `npm run test:e2e`     | Browser, keyboard, accessibility, and responsive checks                            |
| `npm run test:base`    | Verify a GitHub Pages project-path build                                           |
| `npm run build`        | Generate and verify static pages, rendered primitives and asset budgets in `dist/` |
| `npm run preview`      | Serve the generated site locally                                                   |
| `npm run audit`        | Fail on high or critical dependency vulnerabilities                                |
| `npm run validate`     | Run the complete local quality pipeline                                            |

Build before running browser tests independently. Browser results and screenshots are generated evidence, not source assets. `npm ci` requires registry access on a clean machine; dependency audit also requires access to the npm advisory service. A failed or unavailable advisory request is not a clean security result.

## Design system

The reference informs the white/light-blue canvas, navy type, blue gradients, rounded translucent surfaces, restrained shadows, and generous spacing. Values are coherent approximations, not a claim of pixel-perfect extraction. The preview demonstrates reusable components instead of recreating the final Hero, projects, or timeline prematurely.

`src/styles/tokens.css` is the design authority. Semantic tokens govern backgrounds and surfaces, readable text, brand colors, borders, focus, interaction states, gradients, shadows, spacing, fluid type, layout width, radii, control sizes, motion, and stacking. Extend these tokens before adding component-specific values. Keep text and control contrast separate from decorative blues. Components inherit their styles from this shared authority.

Inter provides the self-hosted typographic foundation. Fluid type and gutters adapt between compact mobile and large desktop. The layout uses content-driven grids and a mobile navigation pattern; it does not scale a fixed desktop canvas down. CSS motion is restrained and respects reduced-motion preferences. Keyboard focus remains visible, and controls use touch-friendly targets.

## Content and assets

`src/data/profile.json` holds singleton profile content and is validated by `src/data/profile.ts`. Repeated editorial records live in JSON files under `src/content/`, loaded through `src/content.config.ts`; `src/lib/content.ts` owns schemas, stable identifiers, ordering, publication controls, and reference checks. The architecture covers site identity, hero, highlights, expertise, skills, case studies, experience, education, languages, about, contact, CV, and SEO. Future Pages CMS can edit these ordinary repository files; no CMS integration or credentials are required now.

Only identity and professional position supplied by the owner may appear as verified profile content. Unverified professional fields remain empty. Any component demonstration is clearly labeled as a development example. Do not infer claims from the reference artwork, turn missing values into zero, or publish example achievements as real experience.

Original portrait, alpine photography, approved vector logo, CV PDF, verified career/education details, contact information, external profiles, and final domain are still required for later tasks. The reference image is not shipped as the page UI, and screenshot crops are not treated as high-quality source assets.

Store source images in `src/assets/` and use Astro image optimization for responsive dimensions, suitable formats, and stable aspect ratios. Only files intended to be copied unchanged belong in `public/`, such as vetted documents and icons. Keep alt text tied to image meaning; use empty alt text for purely decorative images. Noncritical images should load lazily; only a genuine above-the-fold critical image should receive eager loading and fetch priority. Do not add unrelated stock substitutes.

Font files are self-hosted with their redistribution license retained. Lucide icons render as SVG with accessible naming handled by the containing control or icon wrapper. Avoid external font services and entire icon sets in client JavaScript.

The preview uses Lucide’s Feather as a temporary library mark. It is not the approved FOLIO logo artwork. The font is SIL Open Font License licensed, and the Lucide license is retained under `public/icons/`.

## URLs, SEO, and GitHub Pages

`src/config/site.ts` owns site presentation and navigation; `src/config/deployment.ts` owns URL configuration. `SITE_URL` is the verified HTTPS origin; `BASE_PATH` is the deployment path (`/` for a root domain, `/folio/` for this project site). The same configuration governs links, static assets, canonical URLs, social metadata, robots, and sitemap output. No domain is guessed when the origin is absent. Person JSON-LD uses only supplied profile facts. `site.indexable` is deliberately false for the foundation preview; sitemap emission is deferred until a verified origin and indexable content are available. Configuring an origin alone does not turn this preview into launch-ready portfolio content.

```sh
# Example configuration only; replace the origin with the real configured domain.
SITE_URL=https://example.com BASE_PATH=/folio/ npm run build
BASE_PATH=/folio/ npm run preview
```

The `Quality` workflow runs on pushes and pull requests with read-only repository access. It uses the lockfile and gates checks, lint, formatting, meaningful tests, dependency audit, a project-path check, the static build, and real Chromium checks. A failure stops the job. Branch protection must be configured in GitHub to require this status; the workflow does not bypass protections.

`Pages readiness (manual)` is dispatch-only. It reads the actual origin and base path from the repository’s configured Pages settings, validates again, and uploads `dist/`. Publication defaults to **false**. Explicit publication is restricted to the default branch; only the deploy job receives Pages write and OIDC permissions. Local checks do not prove that a remote workflow or deployment has run.

Remaining GitHub setup:

1. Inspect the **Quality** run for the pushed foundation commit; local results do not substitute for the GitHub run.
2. Enable GitHub Actions and select **Settings → Pages → Build and deployment → GitHub Actions**. This workflow deliberately does not enable Pages or alter repository settings automatically.
3. Require the quality status through the repository’s branch protection/ruleset. Configure the `github-pages` environment if deployment reviewers or branch restrictions are desired.
4. Run the manual Pages workflow with publication disabled to validate the artifact. Final content, domain/DNS, HTTPS verification, and an intentional public deployment belong to Task 4.

For a future custom domain, configure that domain and DNS in GitHub Pages first. The manual workflow then reads the resulting origin and base path instead of hardcoding the GitHub project URL.

Official GitHub actions are pinned to full commit SHAs verified against their releases: [checkout](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-node](https://github.com/actions/setup-node/releases/tag/v7.1.0), [configure-pages](https://github.com/actions/configure-pages/releases/tag/v6.0.0), [upload-pages-artifact](https://github.com/actions/upload-pages-artifact/releases/tag/v5.0.0), and [deploy-pages](https://github.com/actions/deploy-pages/releases/tag/v5.0.1). Review upstream releases and update the pin plus its version comment together; rerun the gates after updates.

## Security and certification boundaries

Only generated static output is deployable. Keep credentials, private documents, `.env` files, and local artifacts out of source control and `public/`. No runtime secrets, forms backend, tracking scripts, or dynamic HTML injection are needed. External links must have a meaningful accessible name and use appropriate safe link attributes when opening a new tab.

Automated accessibility checks support WCAG 2.2 AA work; they do not certify the complete final site. Browser tests cover representative 320, 375, 390, 768, 1024, 1440, and 1920 px layouts plus transition widths, navigation, keyboard use, reduced motion, and asset behavior. Final Lighthouse/Core Web Vitals, original-image optimization, verified professional content, domain verification, and public-launch certification remain dependent on later tasks and external setup.
