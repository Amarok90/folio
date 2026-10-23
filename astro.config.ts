import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { resolveDeployment } from './src/config/deployment';
import { site } from './src/config/site';

const deployment = resolveDeployment(process.env);

export default defineConfig({
  output: 'static',
  ...(deployment.site ? { site: deployment.site } : {}),
  base: deployment.base,
  trailingSlash: 'always',
  integrations: deployment.site && site.indexable ? [sitemap()] : [],
  vite: { plugins: [tailwindcss()] },
  devToolbar: { enabled: false },
});
