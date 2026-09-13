/**
 * Notify IndexNow after a verified production deployment, never during build.
 * npm run ping -- https://hotzaa-lapoal.info/forms/
 * npm run ping -- --dry-run https://hotzaa-lapoal.info/forms/
 * No URL arguments: use the generated sitemap's indexable URLs.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SITE = 'https://hotzaa-lapoal.info';
const KEY = '5620f623b5b147d1993ca83861041bcf';
const KEY_LOCATION = `${SITE}/${KEY}.txt`;

export function selectUrls(xml, requested = []) {
  const allowed = new Set();
  for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const raw = match[1].trim().replaceAll('&amp;', '&');
    let url;
    try { url = new URL(raw); } catch { continue; }
    if (url.origin !== SITE || url.username || url.password || url.search || url.hash) continue;
    if (/^\/partners\/demo(?:\/|$)/.test(url.pathname)) continue;
    allowed.add(url.href);
  }
  if (!allowed.size) throw new Error('No indexable URLs found in the generated sitemap.');
  if (!requested.length) return [...allowed];
  const result = [...new Set(requested)];
  for (const url of result) {
    if (!allowed.has(url)) throw new Error(`URL is not an indexable canonical sitemap URL: ${url}`);
  }
  return result;
}

export async function notifyIndexNow(urlList, request = fetch) {
  // Participating engines share submissions; one endpoint is sufficient.
  const response = await request('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: 'hotzaa-lapoal.info', key: KEY, keyLocation: KEY_LOCATION, urlList }),
    signal: AbortSignal.timeout(15000),
  });
  if (response.status !== 200 && response.status !== 202) {
    throw new Error(`IndexNow rejected the submission (HTTP ${response.status}). Do not repeatedly resubmit; check the key, URLs or rate limit.`);
  }
  return {
    status: response.status,
    submitted: urlList.length,
    message: response.status === 202
      ? 'URLs received; ownership-key validation pending. Indexing is not guaranteed.'
      : 'URLs received. Indexing and rankings are not guaranteed.',
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const requested = args.filter(arg => arg !== '--dry-run');
  const sitemapPath = fileURLToPath(new URL('../dist/sitemap-0.xml', import.meta.url));
  const xml = await readFile(sitemapPath, 'utf8');
  const urlList = selectUrls(xml, requested);
  if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, urlList }, null, 2));
    return;
  }
  console.log(JSON.stringify(await notifyIndexNow(urlList)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(`IndexNow: ${error.message}`);
    process.exitCode = 1;
  });
}
