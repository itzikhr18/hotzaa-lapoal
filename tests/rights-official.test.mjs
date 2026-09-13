import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { illustrateMonthlyWage, wageList, WAGE_VERIFIED_ON, WAGE_LAW_URL, WAGE_SOURCE_URL } from '../src/data/protected-amounts.ts';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('2026 family bases are the verified official snapshot, not a guaranteed floor', () => {
  assert.deepEqual(wageList.map(item => item.amount), [2596, 3893, 4516, 5139, 4250, 5289]);
  assert.equal(WAGE_VERIFIED_ON, '2026-09-13');
  assert.equal(new URL(WAGE_LAW_URL).hostname, 'www.btl.gov.il');
  assert.equal(new URL(WAGE_SOURCE_URL).hostname, 'www.btl.gov.il');
});

test('low wage is not incorrectly exempt in full', () => {
  assert.deepEqual(illustrateMonthlyWage(1000, 2596), { exempt: 800, remainder: 200 });
  assert.deepEqual(illustrateMonthlyWage(2596, 2596), { exempt: 2076.8, remainder: 519.2 });
});

test('80 percent threshold is continuous and high wages may leave more than 20 percent attachable', () => {
  assert.deepEqual(illustrateMonthlyWage(3245, 2596), { exempt: 2596, remainder: 649 });
  assert.deepEqual(illustrateMonthlyWage(8000, 2596), { exempt: 2596, remainder: 5404 });
});

test('rounding does not overstate the unprotected remainder or invent money', () => {
  assert.deepEqual(illustrateMonthlyWage(1000.01, 2596), { exempt: 800.01, remainder: 200 });
  for (const { amount } of wageList) {
    for (const net of [0.01, 1, 1999.99, amount, amount / 0.8, 10000, 1000000]) {
      const result = illustrateMonthlyWage(net, amount);
      assert.ok(result);
      assert.ok(result.exempt <= amount);
      assert.ok(result.remainder >= 0);
      assert.equal(Math.round((result.exempt + result.remainder) * 100), Math.round(net * 100));
      assert.ok(result.exempt + 0.00001 >= Math.min(amount, net * 0.8));
    }
  }
});

test('invalid and unsupported arithmetic input returns no numeric result', () => {
  for (const bad of [0, -1, NaN, Infinity, -Infinity, 1000001, 0.001]) {
    assert.equal(illustrateMonthlyWage(bad, 2596), null);
    assert.equal(illustrateMonthlyWage(5000, bad), null);
  }
});

test('calculator is explicit opt-in to a dated, monthly non-maintenance illustration, clears stale results and sends nothing', async () => {
  const component = await read('src/components/SalaryGarnishmentCalculator.tsx');
  assert.match(component, /ספטמבר 2026/);
  assert.match(component, /אוגוסט 2026/);
  assert.match(component, /בחוב שאינו מזונות/);
  assert.match(component, /משלם אחד/);
  assert.match(component, /type="checkbox" checked=\{confirmed\}/);
  assert.match(component, /!confirmed \|\| base === undefined \|\| !calculation/);
  assert.match(component, /setSalary\(e.target.value\); clearResult\(\)/);
  assert.match(component, /setFamily\(Number\(e.target.value\)\); clearResult\(\)/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /role="alert"/);
  assert.doesNotMatch(component, /fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|gtag|parseFloat|fullyProtected/);
});

const pages = [
  'rights/index.astro', 'rights/10-zchuyot.astro', 'rights/bayit-muggan.astro', 'rights/hagbalot.astro', 'rights/skhomim-mugganim.astro',
  'guides/ikul-maskoret.astro', 'guides/ikul-heshbon.astro', 'guides/ikul-pensiya/index.astro', 'guides/ikul-dira/index.astro',
  'guides/ikul-nechassim.astro', 'guides/ikul-rechev/index.astro', 'guides/ikul-yetzia/index.astro', 'tools/ikul-maskoret.astro',
];
test('every owned page has official sources, actual edit date and no invented professional-review claim', async () => {
  for (const page of pages) {
    const source = await read('src/pages/' + page);
    assert.match(source, /www\.btl\.gov\.il|WAGE_LAW_URL/, page);
    assert.match(source, /2026-09-13|13\.09\.2026/, page);
    assert.doesNotMatch(source, /reviewerName=|reviewDate=|סיכוי גבוה מאוד|מוגנת לחלוטין|לא ניתן לעקל ממנה כלל|שמחליף את העיקול/, page);
  }
});

test('visible calculator FAQ and structured data share one answer list', async () => {
  const page = await read('src/pages/tools/ikul-maskoret.astro');
  assert.match(page, /mainEntity: questions\.map/);
  assert.match(page, /questions\.map\(q => <details/);
  assert.doesNotMatch(page, /זיהוי משכורת מוגנת שאסור לעקל ממנה כלל/);
});

test('bank article distinguishes benefit 30 days from wage one month and names maintenance exception', async () => {
  const page = await read('src/pages/guides/ikul-heshbon.astro');
  assert.match(page, /30 ימים/);
  assert.match(page, /חודש ימים/);
  assert.match(page, /מזונות/);
  assert.match(page, /מקדמה/);
});

test('dwelling, pension and work-car protections keep critical qualifications', async () => {
  const [home, pension, car, limits] = await Promise.all([
    read('src/pages/rights/bayit-muggan.astro'), read('src/pages/guides/ikul-pensiya/index.astro'),
    read('src/pages/guides/ikul-rechev/index.astro'), read('src/pages/rights/hagbalot.astro'),
  ]);
  assert.match(home, /אינה הבטחה|אינה פטור|לא הכרזה/);
  assert.match(home, /משכנתה/);
  assert.match(home, /סעיף 80/);
  assert.match(pension, /סעיף 26/);
  assert.match(pension, /משיכה חד־פעמית/);
  assert.match(car, /תקרת שווי/);
  assert.match(car, /22\(ב\)/);
  assert.match(limits, /66ד\(ג\)/);
});
