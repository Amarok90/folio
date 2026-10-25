import type { ImageMetadata } from 'astro';
import source from '../data/media.json';
import { profile } from '../data/profile';
import { imageAssetPathSchema, mediaSchema } from '../lib/content';

// Vite resolves only these code-owned, local raster files. Uploaded SVG/remote URLs never execute.
const images = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/**/*.{[pP][nN][gG],[jJ][pP][gG],[jJ][pP][eE][gG],[wW][eE][bB][pP],[aA][vV][iI][fF]}',
  { eager: true },
);

export function resolveImage(path: string): ImageMetadata {
  imageAssetPathSchema.parse(path);
  const image = images[path]?.default;
  if (!image) throw new Error(`The selected image does not exist: ${path}`);
  return image;
}

export const mediaConfig = mediaSchema.parse(source);
const portrait = resolveImage(mediaConfig.portrait.path);

/** Owner-managed paths remain independent of the optimized, base-aware generated URLs. */
export const media = {
  portrait,
  portraitAlt: mediaConfig.portrait.alt,
  portraitTemporary: mediaConfig.portrait.temporary,
  aboutPortrait: mediaConfig.aboutPortrait
    ? resolveImage(mediaConfig.aboutPortrait.path)
    : portrait,
  aboutPortraitAlt: mediaConfig.aboutPortrait?.alt ?? mediaConfig.portrait.alt,
  aboutPortraitTemporary:
    !mediaConfig.aboutPortrait && mediaConfig.portrait.temporary,
  alpine: resolveImage(mediaConfig.alpine.path),
  contact: resolveImage(mediaConfig.contact.path),
  analytics: mediaConfig.analytics
    ? resolveImage(mediaConfig.analytics.path)
    : null,
  analyticsAlt: mediaConfig.analytics?.alt ?? '',
  analyticsIllustrative: mediaConfig.analytics?.illustrative ?? false,
  logo: mediaConfig.logo ? resolveImage(mediaConfig.logo.path) : null,
  logoAlt: mediaConfig.logo?.alt ?? '',
  socialImage: profile.seo.socialImage
    ? resolveImage(profile.seo.socialImage.path)
    : null,
  socialImageAlt: profile.seo.socialImage?.alt ?? '',
  projects: mediaConfig.projects.map((image) => resolveImage(image.path)),
} as const;
