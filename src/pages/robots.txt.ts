import type { APIRoute } from 'astro';
import { site } from '../config/site';
import { withBasePath } from '../lib/urls';

export const GET: APIRoute = ({ site: origin }) =>
  new Response(
    site.indexable && origin
      ? `User-agent: *\nAllow: /\nSitemap: ${new URL(withBasePath('/sitemap-index.xml', import.meta.env.BASE_URL), origin).href}\n`
      : 'User-agent: *\nDisallow: /\n',
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
