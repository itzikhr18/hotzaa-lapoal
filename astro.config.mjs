import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const DIST = new URL('./dist/', import.meta.url);

// lastmod = the newest dateModified the page itself declares in its JSON-LD.
// serialize runs after the build has written dist/, so the rendered HTML is
// the source of truth and the sitemap never claims a change the page doesn't.
function lastModifiedFor(url) {
  const { pathname } = new URL(url);
  const dir = pathname.endsWith('/') ? pathname : `${pathname}/`;
  let html;
  try {
    html = readFileSync(new URL(`.${dir}index.html`, DIST), 'utf8');
  } catch {
    return undefined;
  }
  const today = new Date().toISOString().slice(0, 10);
  const dates = [...html.matchAll(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})/g)]
    .map((m) => m[1])
    .filter((d) => d <= today);
  return dates.sort().at(-1);
}

export default defineConfig({
  site: 'https://hotzaa-lapoal.info',
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    react(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      filter: (page) => page !== 'https://hotzaa-lapoal.info/partners/demo/',
      customPages: [
        'https://hotzaa-lapoal.info/',
        'https://hotzaa-lapoal.info/guides/',
        'https://hotzaa-lapoal.info/tools/calculator/',
        'https://hotzaa-lapoal.info/tools/chatbot/',
        'https://hotzaa-lapoal.info/forms/',
        'https://hotzaa-lapoal.info/faq/',
      ],
      serialize(item) {
        const lastmod = lastModifiedFor(item.url);
        if (lastmod) item = { ...item, lastmod };
        // Homepage gets highest priority
        if (item.url === 'https://hotzaa-lapoal.info/') {
          return { ...item, priority: 1.0, changefreq: 'daily' };
        }
        // Guide index and section indexes
        if (item.url.match(/\/(guides|rights|insolvency|tools|forms)\/?$/)) {
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
        if (item.url.includes('/forms/')) {
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
