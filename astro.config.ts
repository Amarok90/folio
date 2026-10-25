import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { resolveDeployment } from './src/config/deployment';

const deployment = resolveDeployment(process.env);

export default defineConfig({
  output: 'static',
  ...(deployment.site ? { site: deployment.site } : {}),
  base: deployment.base,
  trailingSlash: 'always',
  integrations: deployment.site
    ? [
        sitemap({
          filter: (page) =>
            !page.endsWith('/404.html') &&
            !page.endsWith('/404/') &&
            !page.endsWith('/admin/'),
        }),
      ]
    : [],
  vite: { plugins: [tailwindcss()] },
  devToolbar: { enabled: false },
});
