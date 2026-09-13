import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import test from 'node:test';

const pages = [
  'src/pages/insolvency/index.astro', 'src/pages/insolvency/what-is.astro',
  'src/pages/insolvency/eligibility.astro', 'src/pages/insolvency/process.astro',
  'src/pages/insolvency/costs.astro', 'src/pages/insolvency/haftar.astro',
  'src/pages/guides/pshitat-regel/index.astro', 'src/pages/guides/hisdurim-chov/index.astro',
  'src/pages/forms/index.astro', 'src/pages/tools/eligibility.astro',
  'src/pages/tools/noseach-bakasha.astro',
];
const read = file => readFile(new URL('../' + file, import.meta.url), 'utf8');

test('owned pages derive visible FAQ and FAQ schema from the same question array', async () => {
  for (const file of pages) {
    const source = await read(file);
    assert.match(source, /const faqs = \[/, file);
    assert.match(source, /mainEntity: faqs\.map/, file);
    assert.match(source, /\{faqs\.map/, file);
    assert.doesNotMatch(source, /totalTime:\s*['"]P[34]Y/, file);
    assert.doesNotMatch(source, /reviewerName\s*=|reviewDate\s*=/, file);
  }
});

test('topic navigator does not classify legal eligibility using debt or income', async () => {
  const source = await read('src/components/EligibilityChecker.tsx');
  assert.doesNotMatch(source, /debt_size|yes_salary|yes_benefits|58,794|getEligibility/);
  assert.match(source, /מפת קריאה — לא החלטת זכאות/);
  assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage/);
  assert.match(source, /https:\/\/www\.gov\.il\/he\/service\/delay_processes/);
});

test('request drafts require no preselected legal claim or identifying details for local export', async () => {
  const source = await read('src/components/RequestLetterGenerator.tsx');
  assert.match(source, /useState<number\[\]>\(\[\]\)/);
  assert.match(source, /setSelectedGrounds\(\[\]\)/);
  assert.doesNotMatch(source, /disabled=\{missingFields\}/);
  assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage/);
  assert.match(source, /טופס 233/);
  assert.match(source, /טופס 529/);
  assert.match(source, /יש לערוך ולמחוק כל מסמך שלא צורף/);
});

test('insolvency guidance uses rehabilitation-order period and qualified discharge', async () => {
  const process = await read('src/pages/insolvency/process.astro');
  const eligibility = await read('src/pages/insolvency/eligibility.astro');
  const discharge = await read('src/pages/insolvency/haftar.astro');
  assert.match(process, /שלוש שנים ממועד מתן צו לשיקום כלכלי/);
  assert.match(process, /הגשת בקשה אינה מעכבת הליכים אוטומטית/);
  assert.match(eligibility, /מטעמים מיוחדים/);
  assert.match(eligibility, /בקשת היחיד לממונה במשרד המשפטים/);
  assert.match(discharge, /175/);
  assert.match(discharge, /אי־הגשת תביעת חוב אינה כשלעצמה חריג/);
  assert.doesNotMatch(discharge, /7 שנים ממועד קבלת ההפטר|כ-3 שנים ממועד הדיווח/);
});

test('literal internal destinations on owned content resolve to source pages', async () => {
  for (const file of [...pages, 'src/components/EligibilityChecker.tsx']) {
    const source = await read(file);
    const destinations = [...source.matchAll(/href(?:=|:)\s*['"](\/[^'"]*)['"]/g)].map(match => match[1]);
    for (const destination of new Set(destinations)) {
      const route = destination.split(/[?#]/)[0].replace(/\/$/, '');
      const candidates = route === '' ? ['src/pages/index.astro'] : [
        'src/pages' + route + '.astro', 'src/pages' + route + '/index.astro',
      ];
      const found = await Promise.all(candidates.map(candidate => access(new URL('../' + candidate, import.meta.url)).then(() => true, () => false)));
      assert.ok(found.some(Boolean), file + ' -> ' + destination);
    }
  }
});
