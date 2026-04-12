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
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      customPages: [
        'https://hotzaa-lapoal.info/',
        'https://hotzaa-lapoal.info/guides/',
        'https://hotzaa-lapoal.info/tools/calculator/',
        'https://hotzaa-lapoal.info/tools/chatbot/',
        'https://hotzaa-lapoal.info/faq/',
      ],
      serialize(item) {
        // Homepage gets highest priority
        if (item.url === 'https://hotzaa-lapoal.info/') {
          return { ...item, priority: 1.0, changefreq: 'daily' };
        }
        // Guide index and section indexes
        if (item.url.match(/\/(guides|rights|insolvency|tools)\/?$/)) {
          return { ...item, priority: 0.9, changefreq: 'weekly' };
        }
        // Individual guides — high priority content
        if (item.url.includes('/guides/')) {
          return { ...item, priority: 0.8, changefreq: 'monthly' };
        }
        // Tools
        if (item.url.includes('/tools/')) {
          return { ...item, priority: 0.8, changefreq: 'monthly' };
        }
        // Legal, about, contact — lower priority
        if (item.url.includes('/legal/')) {
          return { ...item, priority: 0.3, changefreq: 'yearly' };
        }
        return item;
      },
    }),
  ],
  output: 'static',
});
