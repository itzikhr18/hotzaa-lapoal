import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { reportAt, upcomingReports, isValidOrder, dueLabel, periodLabel } from '../src/lib/report-schedule.mjs';

const read = file => readFile(new URL('../' + file, import.meta.url), 'utf8');

test('bi-monthly schedule matches the Official Receiver example (order 10.08 → 15.10 for Aug–Sep, then 15.12)', () => {
  const first = reportAt({ stage: 'interim', orderYear: 2026, orderMonth: 7, k: 1 });
  assert.deepEqual(first.due, { year: 2026, month: 9, day: 15 });
  assert.deepEqual([first.from, first.to], [{ year: 2026, month: 7 }, { year: 2026, month: 8 }]);
  const second = reportAt({ stage: 'interim', orderYear: 2026, orderMonth: 7, k: 2 });
  assert.deepEqual(second.due, { year: 2026, month: 11, day: 15 });
  assert.equal(periodLabel(second), 'אוקטובר–נובמבר 2026');
  assert.equal(dueLabel(first), '15 באוקטובר 2026');
});

test('semi-annual schedule matches the example (rehabilitation order 10.2 → 15.8 for Feb–Jul)', () => {
  const first = reportAt({ stage: 'rehab', orderYear: 2027, orderMonth: 1, k: 1 });
  assert.deepEqual(first.due, { year: 2027, month: 7, day: 15 });
  assert.equal(periodLabel(first), 'פברואר–יולי 2027');
});

test('schedule rolls over the year and lists only reports not yet due', () => {
  const nov = reportAt({ stage: 'interim', orderYear: 2026, orderMonth: 10, k: 1 });
  assert.deepEqual(nov.due, { year: 2027, month: 0, day: 15 });
  assert.equal(periodLabel(nov), 'נובמבר–דצמבר 2026');
  const dec = reportAt({ stage: 'interim', orderYear: 2026, orderMonth: 11, k: 1 });
  assert.equal(periodLabel(dec), 'דצמבר 2026 – ינואר 2027');
  assert.deepEqual(dec.due, { year: 2027, month: 1, day: 15 });
  const upcoming = upcomingReports({ stage: 'interim', orderYear: 2026, orderMonth: 3, today: new Date(2026, 9, 8), count: 2 });
  assert.deepEqual(upcoming.map(r => [r.number, r.due.month, r.due.day]), [[3, 9, 15], [4, 11, 15]]);
  const sameDay = upcomingReports({ stage: 'interim', orderYear: 2026, orderMonth: 3, today: new Date(2026, 9, 15), count: 1 });
  assert.equal(sameDay[0].number, 3);
  const nextDay = upcomingReports({ stage: 'interim', orderYear: 2026, orderMonth: 3, today: new Date(2026, 9, 16), count: 1 });
  assert.equal(nextDay[0].number, 4);
});

test('orders in the future, before the 2019 law or with invalid months are rejected', () => {
  const today = new Date(2026, 9, 8);
  assert.equal(isValidOrder({ stage: 'interim', orderYear: 2026, orderMonth: 10, today }), false);
  assert.equal(isValidOrder({ stage: 'interim', orderYear: 2018, orderMonth: 5, today }), false);
  assert.equal(isValidOrder({ stage: 'other', orderYear: 2025, orderMonth: 5, today }), false);
  assert.equal(isValidOrder({ stage: 'rehab', orderYear: 2026, orderMonth: 12, today }), false);
  assert.equal(isValidOrder({ stage: 'rehab', orderYear: 2026, orderMonth: 9, today }), true);
  assert.deepEqual(upcomingReports({ stage: 'interim', orderYear: 2027, orderMonth: 0, today }), []);
});

test('report helper never sends, stores or measures what the user enters', async () => {
  for (const file of ['src/components/InsolvencyReportHelper.tsx', 'src/lib/merge-to-pdf.ts', 'src/lib/report-schedule.mjs']) {
    const source = await read(file);
    assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|gtag|WebSocket/, file);
  }
  const component = await read('src/components/InsolvencyReportHelper.tsx');
  assert.match(component, /שום פרט, סכום או קובץ לא נשלח לאתר ולא נשמר/);
  assert.match(component, /import\('\.\.\/lib\/merge-to-pdf'\)/, 'pdf-lib is loaded only when merging');
});

test('report guide cites the official service page, form and submission site', async () => {
  const page = await read('src/pages/insolvency/doch-du-chodshi.astro');
  assert.match(page, /https:\/\/www\.gov\.il\/he\/service\/bi_monthly_report_about_incomes/);
  assert.match(page, /income-expenditure-report\.pdf/);
  assert.match(page, /apacforms\.justice\.gov\.il/);
  assert.match(page, /\*5067/);
  assert.match(page, /רק מי שאין לו עורך דין רשאי להגיש את הדוח ידנית/);
  assert.match(page, /אין צורך בהן/);
});
