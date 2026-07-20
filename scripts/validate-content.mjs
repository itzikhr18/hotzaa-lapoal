import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const textExtensions = new Set(['.astro', '.js', '.mjs', '.ts', '.tsx', '.txt']);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(root, absolute).replaceAll('\\', '/');
    const lower = relative.toLowerCase();

    if (lower.includes('chatbot') || lower.includes('gemini')) continue;
    if (entry.isDirectory()) files.push(...await collectFiles(absolute));
    else if (textExtensions.has(path.extname(entry.name))) files.push({ absolute, relative });
  }

  return files;
}

const files = [
  ...await collectFiles(path.join(root, 'src')),
  ...await collectFiles(path.join(root, 'functions')),
  ...await collectFiles(path.join(root, 'public')),
];

const documents = new Map();
for (const file of files) documents.set(file.relative, await readFile(file.absolute, 'utf8'));

const failures = [];
const expectIncludes = (file, value, message) => {
  if (!documents.get(file)?.includes(value)) failures.push(`${file}: ${message}`);
};
const expectExcludes = (file, value, message) => {
  if (documents.get(file)?.includes(value)) failures.push(`${file}: ${message}`);
};

expectExcludes('src/components/InterestCalculator.tsx', 'SHEKEL_RATE', 'נשאר שיעור ריבית קשיח');
expectExcludes('src/components/InterestCalculator.tsx', 'OLD_LAW_RATE', 'נשאר שיעור חוק ישן קשיח');
expectExcludes('src/components/InterestCalculator.tsx', 'LeadCaptureForm', 'כלי היתרה עדיין מפעיל טופס ליד');
expectIncludes('src/components/InterestCalculator.tsx', 'הכלי נמצא בבדיקה מקצועית', 'חסרה הודעת השבתה ברורה');

expectExcludes('src/layouts/BaseLayout.astro', 'LeadCaptureWidget', 'ווידג׳ט הלידים עדיין נטען בכל האתר');
expectExcludes('src/layouts/BaseLayout.astro', 'googletagmanager.com/gtag/js', 'Analytics נטען לפני הסכמה');
expectIncludes('src/layouts/BaseLayout.astro', 'AnalyticsConsent', 'חסר מנגנון הסכמה למדידה');

expectIncludes('functions/api/leads.js', 'LEADS_DISABLED', 'נקודת הלידים אינה מסומנת כמושבתת');
expectExcludes('functions/api/leads.js', 'RESEND_API_KEY', 'נקודת הלידים עדיין יכולה לשלוח דוא״ל');
expectExcludes('functions/api/leads.js', 'LEAD_WEBHOOK_URL', 'נקודת הלידים עדיין יכולה להעביר מידע');

expectExcludes('src/components/RequestLetterGenerator.tsx', 'טופס כלכלי מלא (טופס 214)', 'נשאר מספר טופס מטעה');
expectExcludes('src/components/RequestLetterGenerator.tsx', 'התקרה הקבועה בחוק היא 20%', 'נשארה טענת תקרה גורפת');

const forbiddenAcrossSite = [
  'חשב כמה אתה באמת חייב',
  'שיעורי יולי 2026',
  'כ-6% לשנה נכון ליולי 2026',
  'ריבית בסיס שנתית = יתרת חוב × ~0.07',
];

for (const [file, content] of documents) {
  for (const phrase of forbiddenAcrossSite) {
    if (content.includes(phrase)) failures.push(`${file}: נמצא ניסוח מסוכן או לא מאומת: ${phrase}`);
  }
}

if (failures.length) {
  console.error('בדיקת בטיחות התוכן נכשלה:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`בדיקת בטיחות התוכן עברה (${documents.size} קבצים, ללא קובצי צ׳אטבוט/Gemini).`);
}
