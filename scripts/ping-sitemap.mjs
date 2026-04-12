/**
 * Ping Google and Bing with the sitemap URL.
 * This notifies them that the sitemap has been updated.
 *
 * Usage: node scripts/ping-sitemap.mjs
 */

const SITEMAP = 'https://hotzaa-lapoal.info/sitemap-index.xml';

const engines = [
  { name: 'Google', url: `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP)}` },
  { name: 'Bing', url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP)}` },
];

console.log('Pinging search engines with sitemap...');

for (const engine of engines) {
  try {
    const res = await fetch(engine.url);
    console.log(`  ${engine.name}: ${res.status} ${res.statusText}`);
  } catch (err) {
    console.log(`  ${engine.name}: error — ${err.message}`);
  }
}

console.log('Done.');
