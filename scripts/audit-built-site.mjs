import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'dist');
const origin = 'https://hotzaa-lapoal.info';
const excluded = new Set(['/tools/chatbot/']);
const failures = [], warnings = [], pages = new Map();
const decode = text => text.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
const attr = (tag, key) => decode(tag.match(new RegExp('\\b' + key + '\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+))', 'i'))?.slice(1).find(v => v !== undefined) || '');
const compact = text => decode(text).replace(/&#(?:x([0-9a-f]+)|(\d+));/gi,(_,hex,dec)=>String.fromCodePoint(parseInt(hex||dec,hex?16:10))).replaceAll('&nbsp;',' ').replace(/[\s\u200e\u200f]+/g,'');
const meta = (html, key) => [...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]).filter(t=>attr(t,'name')===key).map(t=>attr(t,'content'));
async function collect(dir) {
 for (const entry of await readdir(dir, {withFileTypes:true})) {
  const file = path.join(dir,entry.name), relative=path.relative(root,file).replaceAll('\\','/');
  if (/chatbot|gemini/i.test(relative)) continue;
  if(entry.isDirectory()) await collect(file);
  else if(entry.name.endsWith('.html')) {
   const url=relative==='index.html'?'/':relative.endsWith('/index.html')?'/'+relative.slice(0,-10):'/'+relative;
   const html=await readFile(file,'utf8');
   pages.set(url,{html,file,title:decode(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||''),description:meta(html,'description'),ids:new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>decode(m[1]))),noindex:meta(html,'robots').some(t=>t.includes('noindex'))});
  }
 }
}
await collect(root);
for(const [url,page] of pages) {
 const {html,title,description}=page, issue=message=>failures.push({url,message});
 if(!title.trim())issue('Missing title');
 if(description.length!==1||!description[0].trim())issue('Expected one nonempty meta description');
 if((html.match(/<h1(?:\s|>)/gi)||[]).length!==1)issue('Expected one H1');
 const canon=[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]).filter(t=>attr(t,'rel')==='canonical').map(t=>attr(t,'href'));
 if(url!='/404.html'&&(canon.length!==1||canon[0]!==origin+url))issue('Incorrect or duplicate canonical: '+canon.join(','));
 if(url==='/404.html'&&!page.noindex)issue('404 must be noindex');
 const robotTags=meta(html,'robots');
 if(robotTags.length!==1)issue('Expected one robots meta tag');
 if(['/partners/','/partners/demo/'].includes(url)&&!robotTags[0]?.split(',').map(t=>t.trim()).includes('follow'))issue('Expected explicit follow on partners/demo');
 const visibleText=compact(html.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' '));
 const verifyFaq=(schema)=>{
  if(!schema||typeof schema!=='object')return;
  if(schema['@type']==='FAQPage')for(const question of schema.mainEntity||[]){
   const answers=Array.isArray(question.acceptedAnswer)?question.acceptedAnswer:[question.acceptedAnswer];
   for(const value of[question.name,...answers.map(a=>a?.text)])if(value&&!visibleText.includes(compact(value)))issue('FAQ schema text missing from rendered content: '+value.slice(0,100));
  }
  for(const value of Object.values(schema))if(value&&typeof value==='object')Array.isArray(value)?value.forEach(verifyFaq):verifyFaq(value);
 };
 const allIds=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>decode(m[1]));
 if(new Set(allIds).size!==allIds.length)issue('Duplicate HTML IDs');
 for(const block of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
  try{verifyFaq(JSON.parse(block[1]));}catch{issue('Invalid JSON-LD syntax');}
 }
 for(const tag of html.matchAll(/<a\b[^>]*>/gi)) {
  const href=attr(tag[0],'href');if(/^(javascript:|data:)/i.test(href)){issue('Unsafe link scheme '+href.slice(0,40));continue;}if(!href||/^(mailto:|tel:)/i.test(href))continue;
  let target;try{target=new URL(href,origin+url);}catch{issue('Invalid href '+href);continue;}
  if(target.origin!==origin||excluded.has(target.pathname))continue;
  const dest=pages.get(target.pathname);
  if(!dest){if(!/\.[a-z0-9]+$/i.test(target.pathname))issue('Broken internal page '+href);continue;}
  if(target.hash&&!dest.ids.has(decodeURIComponent(target.hash.slice(1))))issue('Missing internal anchor '+href);
 }
 for(const image of html.matchAll(/<img\b[^>]*>/gi))if(!/\balt=/.test(image[0]))issue('Image missing alt attribute');
 if(Buffer.byteLength(html)>200000)warnings.push({url,message:'HTML exceeds 200 KB uncompressed'});
}
for(const field of ['title','description']) {
 const seen=new Map();for(const[url,page]of pages){if(page.noindex)continue;const value=String(page[field]);if(seen.has(value))failures.push({url,message:'Duplicate '+field+' with '+seen.get(value)});else seen.set(value,url);}
}
const sitemap=await readFile(path.join(root,'sitemap-0.xml'),'utf8');
const locations=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>decode(m[1]));
if(locations.includes(origin+'/partners/demo/'))failures.push({url:'/partners/demo/',message:'Demo present in sitemap'});
for(const[url,page]of pages)if(url!='/404.html'&&locations.includes(origin+url)===page.noindex)failures.push({url,message:page.noindex?'Noindex page in sitemap':'Indexable page missing from sitemap'});
const robots=await readFile(path.join(root,'robots.txt'),'utf8');
if(!robots.includes('Sitemap: '+origin+'/sitemap-index.xml'))failures.push({url:'/robots.txt',message:'Missing sitemap declaration'});
for(const url of ['/','/partners/','/partners/demo/'])if(!pages.has(url))failures.push({url,message:'Required page missing'});
if(pages.get('/partners/')?.noindex)failures.push({url:'/partners/',message:'Partners is noindex'});
if(!pages.get('/partners/demo/')?.noindex)failures.push({url:'/partners/demo/',message:'Demo is indexable'});
const result={scope:'Built HTML only; excludes chatbot/Gemini; not a legal certification, live crawl, rich-result certification or field-performance score',checkedPages:pages.size,sitemapUrls:locations.length,failures,warnings};
console.log(JSON.stringify(result,null,2));
if(failures.length)process.exitCode=1;
