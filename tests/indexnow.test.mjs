import test from 'node:test';
import assert from 'node:assert/strict';
import { selectUrls, notifyIndexNow } from '../scripts/ping-indexnow.mjs';

const xml = `<urlset>
<url><loc>https://hotzaa-lapoal.info/forms/</loc></url>
<url><loc>https://hotzaa-lapoal.info/guides/bdika-tik/</loc></url>
<url><loc>https://hotzaa-lapoal.info/forms/</loc></url>
<url><loc>https://hotzaa-lapoal.info/partners/demo/</loc></url>
<url><loc>https://hotzaa-lapoal.info.attacker.example/forms/</loc></url>
<url><loc>https://hotzaa-lapoal.info/forms/?email=private</loc></url>
</urlset>`;

test('IndexNow selects only canonical sitemap URLs and excludes the private demo', () => {
  assert.deepEqual(selectUrls(xml), [
    'https://hotzaa-lapoal.info/forms/',
    'https://hotzaa-lapoal.info/guides/bdika-tik/',
  ]);
  assert.deepEqual(selectUrls(xml, ['https://hotzaa-lapoal.info/forms/']), ['https://hotzaa-lapoal.info/forms/']);
  for (const url of ['https://other.example/', 'https://hotzaa-lapoal.info/partners/demo/', 'https://hotzaa-lapoal.info/forms/?email=private']) {
    assert.throws(() => selectUrls(xml, [url]), /not an indexable canonical/);
  }
});

test('IndexNow sends once and distinguishes acknowledgement from indexing', async () => {
  const calls = [];
  const urls = selectUrls(xml);
  const result = await notifyIndexNow(urls, async (url, options) => {
    calls.push({ url, options });
    return { status: 202 };
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.indexnow.org/indexnow');
  assert.deepEqual(JSON.parse(calls[0].options.body).urlList, urls);
  assert.equal(result.status, 202);
  assert.match(result.message, /validation pending/);
  assert.match(result.message, /not guaranteed/);
});

test('a rejected IndexNow submission fails instead of reporting Done', async () => {
  await assert.rejects(notifyIndexNow(selectUrls(xml), async () => ({ status: 429 })), /HTTP 429/);
});
