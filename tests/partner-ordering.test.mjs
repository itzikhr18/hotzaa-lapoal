import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const source = read('src/data/partners.ts');
const contact = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('purchase inquiries use the owner-approved email and a business-only draft', () => {
  assert.equal(contact.PARTNER_EMAIL, 'itzikhr18@gmail.com');
  assert.equal(contact.PARTNER_ALTERNATE_EMAIL, 'partners@hotzaa-lapoal.info');
  const draft = new URL(contact.PARTNER_CONTACT_HREF);
  assert.equal(draft.protocol, 'mailto:');
  assert.equal(draft.pathname, contact.PARTNER_EMAIL);
  assert.match(draft.searchParams.get('subject'), /בדוא״ל בלבד/);
  assert.match(draft.searchParams.get('body'), /ללא שיחת מכירה/);
  assert.match(draft.searchParams.get('body'), /אין לצרף פרטי לקוחות/);
  assert.equal(draft.searchParams.has('cc'), false);
  assert.equal(draft.searchParams.has('bcc'), false);
});

test('the contact UI and offer disclose email-only inquiry rather than automatic purchase', () => {
  const component = read('src/components/PartnerContact.astro');
  const page = read('src/pages/partners/index.astro');
  assert.match(component, /href=\{PARTNER_CONTACT_HREF\}/);
  assert.match(component, /PARTNER_ALTERNATE_EMAIL/);
  assert.match(component, /אין חיוב או רכישה אוטומטיים/);
  assert.match(component, /ללא צורך בשיחת מכירה/);
  assert.match(page, /כרגע אין באתר סליקה או אספקה אוטומטיות/);
  assert.doesNotMatch(component, /<form\b|fetch\s*\(|XMLHttpRequest|sendBeacon/);
});
