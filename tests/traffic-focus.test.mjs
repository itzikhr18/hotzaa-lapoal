import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('new sales promotions and personal-email ordering have been withdrawn', () => {
  for (const path of ['src/pages/index.astro', 'src/pages/tools/index.astro', 'src/components/Header.astro']) {
    assert.doesNotMatch(read(path), /PartnerOffer|data-growth-event|ללא שיחת מכירה/);
  }
  for (const path of ['src/pages/partners/index.astro', 'src/pages/partners/demo.astro']) {
    assert.doesNotMatch(read(path), /PartnerContact|data-growth-event|itzikhr18@gmail\.com/);
    assert.match(read(path), /partners@hotzaa-lapoal\.info/);
  }
  assert.equal(existsSync(new URL('../src/components/PartnerOffer.astro', import.meta.url)), false);
  assert.equal(existsSync(new URL('../src/components/PartnerContact.astro', import.meta.url)), false);
});

test('priority search pages expose matching section links and official resources', () => {
  const forms = read('src/pages/forms/index.astro');
  for (const id of ['form-214', 'form-218', 'form-233']) {
    assert.ok(forms.includes(`id: '${id}'`));
    assert.ok(forms.includes(`href="#${id}"`));
  }
  assert.match(forms, /id=\{item.id\}/);
  assert.match(forms, /https:\/\/www\.gov\.il\/BlobFolder\/service\/processes_cancellation\/he\/form214\.pdf/);
  const guide = read('src/pages/guides/bdika-tik/index.astro');
  for (const id of ['check-by-id', 'check-attachments', 'case-report']) {
    assert.ok(guide.includes(`id="${id}"`));
    assert.ok(guide.includes(`href="#${id}"`));
  }
  assert.match(guide, /אין להזין באתר זה תעודת זהות או פרטי תיק/);
});

test('editorial dates do not claim a new verification of every legal fact', () => {
  const layout = read('src/layouts/GuideLayout.astro');
  assert.match(layout, /נערך ב\{fmtMonthYear\(updateDate\)\}/);
  assert.doesNotMatch(layout, /עודכן לנתוני/);
});
