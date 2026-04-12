/**
 * IndexNow — notify search engines (Bing, Yandex, Seznam, Naver)
 * about new or updated pages immediately after build.
 *
 * Usage: node scripts/ping-indexnow.mjs
 */

const SITE = 'https://hotzaa-lapoal.info';
const KEY = '5620f623b5b147d1993ca83861041bcf';
const KEY_LOCATION = `${SITE}/${KEY}.txt`;

// All important pages to submit
const urlList = [
  '/',
  '/guides/',
  '/guides/ikul-heshbon/',
  '/guides/bitul-ikul/',
  '/guides/ikul-maskoret/',
  '/guides/bdika-tik/',
  '/guides/michtav-hotzaa/',
  '/guides/tzav-tashlumim/',
  '/guides/ichud-tikim/',
  '/guides/pshitat-regel/',
  '/guides/hisdurim-chov/',
  '/guides/psak-din/',
  '/guides/mazamot/',
  '/guides/orech-din/',
  '/guides/ikul-yetzia/',
  '/guides/bitul-hagbalot/',
  '/guides/ikul-rechev/',
  '/guides/ikul-dira/',
  '/guides/ikul-pensiya/',
  '/guides/kinnus-nechasim/',
  '/guides/ribit-hotzaa/',
  '/guides/hitnagdut-letik/',
  '/guides/hakirat-yecholet/',
  '/guides/hitiyashnoot-chov/',
  '/guides/sgor-tik/',
  '/guides/arev/',
  '/guides/irur-hotzaa/',
  '/guides/ikul-zman/',
  '/guides/hayav-mugbal/',
  '/guides/ikul-nechassim/',
  '/guides/chov-arnona/',
  '/guides/atzmait/',
  '/guides/tikunim-2025/',
  '/guides/lishkat-hotzaa/',
  '/guides/rishayon-nehiga/',
  '/insolvency/',
  '/insolvency/what-is/',
  '/insolvency/eligibility/',
  '/insolvency/process/',
  '/insolvency/costs/',
  '/rights/',
  '/rights/10-zchuyot/',
  '/rights/skhomim-mugganim/',
  '/rights/hagbalot/',
  '/rights/bayit-muggan/',
  '/tools/',
  '/tools/calculator/',
  '/tools/chatbot/',
  '/tools/eligibility/',
  '/faq/',
  '/milon/',
  '/nitunim/',
  '/about/',
  '/contact/',
];

const payload = {
  host: 'hotzaa-lapoal.info',
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList: urlList.map(path => `${SITE}${path}`),
};

async function ping(engine) {
  const endpoint = `https://${engine}/indexnow`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });
    console.log(`  ${engine}: ${res.status} ${res.statusText}`);
  } catch (err) {
    console.log(`  ${engine}: error — ${err.message}`);
  }
}

console.log(`IndexNow: submitting ${urlList.length} URLs...`);
await Promise.all([
  ping('api.indexnow.org'),
  ping('www.bing.com'),
  ping('yandex.com'),
]);
console.log('Done.');
