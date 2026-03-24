import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://hotzaa-lapoal.info',
  integrations: [
    react(),
    tailwind(),
    sitemap({
      i18n: {
        defaultLocale: 'he',
        locales: { he: 'he-IL' }
      }
    })
  ],
  output: 'static',
});
