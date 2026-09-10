import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { getProfessionalReview, reviewSchemaFields } from '../src/lib/professional-review.mjs';

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

test('guides credit a professional reviewer only with a name and a real review date', async () => {
  const reviewer = { reviewerName: 'ישראלה ישראלי', reviewerTitle: 'עורכת דין' };

  for (const props of [
    { updateDate: '2026-09-01' },
    { ...reviewer, updateDate: '2026-09-01' },
    { reviewDate: '2026-08-01', updateDate: '2026-09-01' },
    { reviewerName: '   ', reviewDate: '2026-08-01' },
    { ...reviewer, reviewDate: 'not a date' },
  ]) {
    assert.equal(getProfessionalReview(props), null);
  }
  assert.deepEqual(reviewSchemaFields(null), {});

  const review = getProfessionalReview({ ...reviewer, reviewDate: '2026-08-01', updateDate: '2026-09-01' });
  assert.equal(review.changedSinceReview, true);
  assert.deepEqual(reviewSchemaFields(review), {
    reviewedBy: { '@type': 'Person', name: 'ישראלה ישראלי', jobTitle: 'עורכת דין' },
    lastReviewed: '2026-08-01',
  });
  assert.equal(
    getProfessionalReview({ ...reviewer, reviewDate: '2026-09-01', updateDate: '2026-09-01' }).changedSinceReview,
    false,
  );

  const layout = await read('src/layouts/GuideLayout.astro');
  assert.doesNotMatch(layout, /lastFactCheck|reviewDate\s*=[^=]|reviewedBy\s*:|lastReviewed\s*:/);
  const credit = layout.match(/\{review \? \(([\s\S]*?)\) : \(/);
  assert.ok(credit, 'the reviewer credit must sit behind the review check');
  assert.match(credit[1], /נבדק מקצועית על ידי/);
  assert.equal(layout.split('נבדק מקצועית על ידי').length, 2);
});

test('partner demo stays local, avoids personal-data collection and is not indexed', async () => {
  const source = await read('src/pages/partners/demo.astro');
  assert.doesNotMatch(source, /fetch\(|localStorage|sessionStorage|\/api\//);
  assert.doesNotMatch(source, /type=["'](?:email|tel|number)["']/);
  assert.match(source, /noindex=\{true\}/);
  assert.match(source, /הבחירות עצמן אינן נשמרות ואינן נשלחות אלינו/);
  assert.match(source, /אינה מחליפה ייעוץ משפטי אישי/);
});
