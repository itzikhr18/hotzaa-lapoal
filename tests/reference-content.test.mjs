import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {faqCategories,officialSources,REFERENCE_EDITED} from '../src/data/reference-content.mjs';
import {glossarySections} from '../src/data/glossary.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const faqs=faqCategories.flatMap(c=>c.questions);
const terms=glossarySections.flatMap(c=>c.terms);
test('reference answers and terms have unique stable IDs and primary official sources',()=>{
 assert.ok(faqs.length>=40);assert.ok(terms.length>=60);
 for(const rows of[faqs,terms]){
  assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
  for(const row of rows){assert.ok(row.source.label);const u=new URL(row.source.url);assert.equal(u.protocol,'https:');assert.match(u.hostname,/(^|\.)(gov\.il|btl\.gov\.il|knesset\.gov\.il|creditdata\.org\.il)$/);}
 }
 assert.equal(REFERENCE_EDITED,'2026-09-13');assert.ok(Object.keys(officialSources).length>10);
});
test('FAQ and glossary render the same reference data and visible source links',async()=>{
 const faq=await read('src/pages/faq/index.astro'), glossary=await read('src/pages/milon/index.astro'), home=await read('src/pages/index.astro');
 for(const text of[faq,home]){assert.match(text,/reference-content\.mjs/);assert.match(text,/faq\.source\.url/);}
 assert.match(glossary,/glossary\.mjs/);assert.match(glossary,/term\.source\.url/);
 assert.doesNotMatch(faq+glossary+home,/100\+|101 שאלות|רובם לא יודעים|מקפיא עיקולים/);
});
test('reference wage and benefit rules preserve distinct limits and deposit periods',()=>{
 const answer=id=>faqs.find(q=>q.id===id)?.a;
 assert.match(answer('salary-seizure-1'),/80%/);
 assert.match(answer('salary-seizure-2'),/אינו|אינה|לא/);
 assert.match(answer('bank-seizure-1'),/30/);
 assert.match(answer('bank-seizure-2'),/חודש/);
 assert.match(answer('restrictions-1'),/2022/);
});
test('GEO map and editorial policy do not fabricate a professional review or numeric legal guarantees',async()=>{
 const llms=await read('public/llms.txt'), about=await read('src/pages/about/index.astro');
 assert.doesNotMatch(llms,/שכר.*20%|מאגר מאומת|הפטר.*3 שנים/);
 assert.match(about,/id="editorial-policy"/);
 assert.match(about,/בינה מלאכותית/);
 assert.match(about,/לא הושלמה בדיקה משפטית חיצונית/);
});
test('site statistics use an Article and identify the source period, not an invented licensed dataset',async()=>{
 const s=await read('src/pages/nitunim/index.astro');
 assert.match(s,/560,894/);assert.match(s,/2025/);
 assert.doesNotMatch(s,/'Dataset'|CreativeWorkSeries|creativecommons\.org|75%|85%/);
});
