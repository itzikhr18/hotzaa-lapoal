import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('interest tool does not calculate an estimated balance or collect a lead', async () => {
  const source = await read('src/components/InterestCalculator.tsx');
  assert.doesNotMatch(source, /SHEKEL_RATE|OLD_LAW_RATE|LeadCaptureForm/);
  assert.match(source, /הכלי נמצא בבדיקה מקצועית/);
  assert.match(source, /go\.gov\.il\/ecagovernmentident/);
});

test('lead endpoint rejects requests without reading or forwarding personal data', async () => {
  const source = await read('functions/api/leads.js');
  assert.match(source, /LEADS_DISABLED/);
  assert.doesNotMatch(source, /request\.json|RESEND_API_KEY|LEAD_WEBHOOK_URL/);
});

test('analytics is loaded through explicit consent instead of the shared layout', async () => {
  const layout = await read('src/layouts/BaseLayout.astro');
  const consent = await read('src/components/AnalyticsConsent.astro');
  assert.doesNotMatch(layout, /googletagmanager\.com\/gtag\/js|LeadCaptureWidget/);
  assert.match(layout, /AnalyticsConsent/);
  assert.match(consent, /hotzaaAnalyticsConsent/);
  assert.match(consent, /אישור מדידה/);
});

test('request generator avoids the known form and wage-cap misstatements', async () => {
  const source = await read('src/components/RequestLetterGenerator.tsx');
  assert.doesNotMatch(source, /טופס כלכלי מלא \(טופס 214\)/);
  assert.doesNotMatch(source, /התקרה הקבועה בחוק היא 20%/);
  assert.match(source, /טופס 233/);
  assert.match(source, /טופס 529/);
});

test('partner demo stays local, avoids personal-data collection and is not indexed', async () => {
  const source = await read('src/pages/partners/demo.astro');
  assert.doesNotMatch(source, /fetch\(|localStorage|sessionStorage|\/api\//);
  assert.doesNotMatch(source, /type=["'](?:email|tel|number)["']/);
  assert.match(source, /noindex=\{true\}/);
  assert.match(source, /הבחירות עצמן אינן נשמרות ואינן נשלחות אלינו/);
  assert.match(source, /אינה מחליפה ייעוץ משפטי אישי/);
});
