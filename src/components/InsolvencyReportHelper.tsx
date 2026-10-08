import { useEffect, useMemo, useRef, useState } from 'react';
import {
  upcomingReports, dueLabel, periodLabel, HEBREW_MONTHS, FIRST_ORDER_YEAR, SCHEDULE_SOURCE_URL,
} from '../lib/report-schedule.mjs';

type Stage = 'interim' | 'rehab';

// כל הנתונים נשארים בזיכרון הדף בלבד: אין שליחה לרשת, אין שמירה בדפדפן ואין מדידה של מה שמוזן.

const conditions = [
  { id: 'salary', label: 'אני עובד/ת כשכיר/ה' },
  { id: 'spouse', label: 'בן או בת הזוג שלי עובד/ת' },
  { id: 'adultKids', label: 'גרים איתי ילדים בגירים שעובדים' },
  { id: 'selfEmployed', label: 'אני עובד/ת כעצמאי/ת' },
  { id: 'pension', label: 'יש לי הכנסה מפנסיה' },
  { id: 'rentIncome', label: 'יש לי הכנסה משכר דירה' },
  { id: 'nii', label: 'אני או בן משפחה שגר איתי מקבלים קצבה מביטוח לאומי' },
  { id: 'support', label: 'אני מקבל/ת תמיכה או מתנות, בכסף או בשווה כסף' },
  { id: 'renting', label: 'אני גר/ה בשכירות' },
  { id: 'mortgage', label: 'אני משלם/ת משכנתא' },
  { id: 'car', label: 'יש לי רכב בבעלותי' },
] as const;

type ConditionId = typeof conditions[number]['id'];

const conditionalDocs: { when: ConditionId; text: string }[] = [
  { when: 'salary', text: 'תלושי השכר שלי לחודשי הדוח' },
  { when: 'spouse', text: 'תלושי השכר של בן או בת הזוג' },
  { when: 'adultKids', text: 'תלושי השכר של הילדים הבגירים שגרים איתי' },
  { when: 'selfEmployed', text: 'הדיווחים שלי לרשויות המס: מע״מ ומס הכנסה' },
  { when: 'pension', text: 'מסמך שמעיד על ההכנסה מפנסיה' },
  { when: 'rentIncome', text: 'מסמך שמעיד על ההכנסה משכר דירה' },
  { when: 'nii', text: 'מסמך שמעיד על הקצבה מביטוח לאומי' },
  { when: 'support', text: 'מסמך שמעיד על התמיכה או המתנות' },
  { when: 'renting', text: 'הסכם שכירות עדכני' },
  { when: 'mortgage', text: 'אישור על תשלום המשכנתא' },
  { when: 'car', text: 'מסמכים על הוצאות הרכב' },
];

const incomeLines = [
  'הכנסה ממשכורת (נטו)', 'הכנסה מעסק', 'פנסיה', 'הכנסה משכר דירה',
  'קצבאות מהמוסד לביטוח לאומי', 'הכנסות מתשלום מזונות', 'הכנסות נוספות (סכום כל השורות הנוספות)',
];
const expenseLines = [
  'שכר דירה', 'משכנתא', 'מיסי עירייה', 'כלכלה (מזון) — בטופס מציינים גם את מספר הנפשות', 'טלפון, כבלים ואינטרנט', 'טלפון נייד', 'גז',
  'ועד בית', 'מים', 'חשמל', 'תשלום חודשי לממונה', 'הוצאות רפואיות',
  'נסיעות לעבודה שהמעביד לא משלם (תחבורה ציבורית)', 'טיפול יום בילדים עד גיל 3',
  'תשלום מזונות (להורה המשמורן)', 'נסיעות שאינן לצורכי עבודה', 'אחזקת רכב', 'חינוך ותרבות', 'הלבשה',
  'הוצאות נוספות (סכום כל השורות הנוספות)',
];

const money = (value: number) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 2 }).format(value);
const parseAmount = (raw: string) => {
  const normalized = raw.replace(/[,\s₪]/g, '');
  if (normalized === '') return { value: 0, valid: true };
  return /^\d+(?:\.\d{1,2})?$/.test(normalized) ? { value: Number(normalized), valid: true } : { value: 0, valid: false };
};
const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

const cardClass = 'rounded-xl border border-neutral-border bg-white p-4 sm:p-5 space-y-4';
const buttonClass = 'rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50';
const smallButtonClass = 'rounded-md border border-neutral-border px-2 py-1 text-sm disabled:opacity-40';

function AmountTable({ title, lines, values, onChange, months }: {
  title: string; lines: string[]; values: string[][]; onChange: (row: number, col: number, value: string) => void;
  months: [string, string];
}) {
  const totals = [0, 1].map(col => values.reduce((sum, row) => sum + parseAmount(row[col]).value, 0));
  return <fieldset className="space-y-2">
    <legend className="font-bold">{title}</legend>
    <div className="grid grid-cols-[1fr_5.75rem_5.75rem] gap-2 text-sm font-semibold text-gray-600" aria-hidden="true">
      <span>שורה בטופס</span><span>{months[0]}</span><span>{months[1]}</span>
    </div>
    {lines.map((line, row) => <div key={line} className="grid grid-cols-[1fr_5.75rem_5.75rem] items-center gap-2">
      <span className="text-sm">{row + 1}. {line}</span>
      {[0, 1].map(col => {
        const parsed = parseAmount(values[row][col]);
        return <input key={col} type="text" inputMode="decimal" value={values[row][col]}
          onChange={event => onChange(row, col, event.target.value)}
          aria-label={`${line} — ${months[col]}`} aria-invalid={!parsed.valid}
          className={`w-full rounded-md border px-2 py-1.5 text-left ${parsed.valid ? '' : 'border-red-600'}`} dir="ltr" />;
      })}
    </div>)}
    <div className="grid grid-cols-[1fr_5.75rem_5.75rem] gap-2 border-t pt-2 font-bold" aria-live="polite">
      <span>סה״כ</span><span>{money(totals[0])}</span><span>{money(totals[1])}</span>
    </div>
  </fieldset>;
}

export default function InsolvencyReportHelper() {
  const now = new Date();
  const [stage, setStage] = useState<Stage>('interim');
  const [orderMonth, setOrderMonth] = useState('');
  const [orderYear, setOrderYear] = useState('');
  const [situation, setSituation] = useState<Record<ConditionId, boolean>>(() => Object.fromEntries(conditions.map(c => [c.id, false])) as Record<ConditionId, boolean>);
  const [ready, setReady] = useState<Record<string, boolean>>({});
  const [incomes, setIncomes] = useState(() => incomeLines.map(() => ['', '']));
  const [expenses, setExpenses] = useState(() => expenseLines.map(() => ['', '']));
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<{ url: string; size: number; pages: number; skipped: { name: string; reason: string }[] } | null>(null);
  const [mergeError, setMergeError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result]);

  const years = useMemo(() => {
    const list: number[] = [];
    for (let year = now.getFullYear(); year >= FIRST_ORDER_YEAR; year -= 1) list.push(year);
    return list;
  }, []);

  const reports = orderMonth !== '' && orderYear !== ''
    ? upcomingReports({ stage, orderYear: Number(orderYear), orderMonth: Number(orderMonth), today: now })
    : [];
  const futureOrder = orderMonth !== '' && orderYear !== '' && reports.length === 0;
  const monthsSinceOrder = orderMonth !== '' && orderYear !== ''
    ? (now.getFullYear() * 12 + now.getMonth()) - (Number(orderYear) * 12 + Number(orderMonth)) : 0;

  const docs = [
    'הטופס הרשמי "דוח על הכנסות והוצאות" — מלא וחתום, עם מספר התיק במערכת הממונה, כתובת עדכנית ומספר טלפון',
    ...conditionalDocs.filter(doc => situation[doc.when]).map(doc => doc.text),
    'מסמכים על הוצאות אחזקת הבית: חשמל, מים, ארנונה, טלפון, כבלים, הוצאות חינוך ועוד',
    ...(stage === 'interim' ? ['קבלות על קניות מזון, מוצרי צריכה ומוצרים אחרים שאתם ובני הבית צריכים'] : []),
    'אם השתנה משהו מהותי במצב הכלכלי — למשל נכס שקיבלתם, קניתם או ירשתם — פירוט שלו בדוח',
  ];
  const readyCount = docs.filter(doc => ready[doc]).length;

  const interimNext = stage === 'interim' ? reports[0] : undefined;
  const months: [string, string] = interimNext
    ? [HEBREW_MONTHS[interimNext.from.month], HEBREW_MONTHS[interimNext.to.month]]
    : ['חודש ראשון', 'חודש שני'];

  const updateTable = (setter: typeof setIncomes) => (row: number, col: number, value: string) =>
    setter(previous => previous.map((line, index) => (index === row ? line.map((cell, c) => (c === col ? value : cell)) : line)));

  function clearResult() {
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);
    setMergeError('');
  }

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    // Copy the files before resetting the input: resetting it empties the live FileList.
    const picked = Array.from(list);
    clearResult();
    setFiles(previous => [...previous, ...picked]);
    if (fileInput.current) fileInput.current.value = '';
  }

  function move(index: number, delta: number) {
    clearResult();
    setFiles(previous => {
      const next = [...previous];
      const target = index + delta;
      if (target < 0 || target >= next.length) return previous;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function merge() {
    clearResult();
    setBusy(true);
    setProgress('טוען את רכיב האיחוד…');
    try {
      const { mergeToPdf } = await import('../lib/merge-to-pdf');
      const merged = await mergeToPdf(files, (done, total) => setProgress(`מעבד קובץ ${done} מתוך ${total}…`));
      if (merged.pages === 0) {
        setMergeError('לא נוצר קובץ: אף אחד מהקבצים לא נקרא בהצלחה.');
        setResult({ url: '', size: 0, pages: 0, skipped: merged.skipped });
      } else {
        const blob = new Blob([merged.bytes], { type: 'application/pdf' });
        setResult({ url: URL.createObjectURL(blob), size: blob.size, pages: merged.pages, skipped: merged.skipped });
      }
    } catch {
      setMergeError('האיחוד נכשל בדפדפן הזה. נסו דפדפן אחר מעודכן, או פחות קבצים בכל פעם.');
    } finally {
      setBusy(false);
      setProgress('');
    }
  }

  function clearAll() {
    clearResult();
    setFiles([]);
    setIncomes(incomeLines.map(() => ['', '']));
    setExpenses(expenseLines.map(() => ['', '']));
    setReady({});
  }

  return <div dir="rtl" className="space-y-6 text-base">
    <p className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
      <strong>פרטיות:</strong> הכלי עובד רק בדפדפן שלכם. שום פרט, סכום או קובץ לא נשלח לאתר ולא נשמר.
      כשסוגרים או מרעננים את הדף, הכול נמחק. לכן העתיקו את הסכומים והורידו את הקובץ לפני שאתם יוצאים.
    </p>

    <section className={cardClass} aria-labelledby="rh-when">
      <h3 id="rh-when" className="text-lg font-bold">1. מתי צריך להגיש?</h3>
      <fieldset className="space-y-2">
        <legend className="font-semibold">באיזה שלב אתם?</legend>
        <label className="flex items-start gap-2"><input type="radio" name="rh-stage" checked={stage === 'interim'} onChange={() => setStage('interim')} className="mt-1.5" />
          <span>קיבלתי <strong>צו לפתיחת הליכים</strong> (עוד אין צו לשיקום כלכלי) — דוח כל חודשיים</span></label>
        <label className="flex items-start gap-2"><input type="radio" name="rh-stage" checked={stage === 'rehab'} onChange={() => setStage('rehab')} className="mt-1.5" />
          <span>קיבלתי <strong>צו לשיקום כלכלי</strong> — דוח כל חצי שנה</span></label>
      </fieldset>
      <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
        <label className="space-y-1"><span className="block text-sm font-semibold">{stage === 'rehab' ? 'חודש מתן צו השיקום' : 'חודש מתן צו הפתיחה'}</span>
          <select value={orderMonth} onChange={event => setOrderMonth(event.target.value)} className="w-full rounded-lg border bg-white px-2 py-2">
            <option value="">בחרו</option>
            {HEBREW_MONTHS.map((name, index) => <option key={name} value={index}>{name}</option>)}
          </select></label>
        <label className="space-y-1"><span className="block text-sm font-semibold">שנה</span>
          <select value={orderYear} onChange={event => setOrderYear(event.target.value)} className="w-full rounded-lg border bg-white px-2 py-2">
            <option value="">בחרו</option>
            {years.map(year => <option key={year} value={year}>{year}</option>)}
          </select></label>
      </div>
      <div aria-live="polite" className="space-y-2">
        {futureOrder && <p className="text-red-800">החודש שבחרתם עוד לא הגיע. בחרו את החודש שבו ניתן הצו.</p>}
        {reports.length > 0 && <>
          <p className="font-semibold">הדוחות הקרובים שלכם:</p>
          <ol className="space-y-2">
            {reports.map(report => <li key={report.number} className="rounded-lg bg-blue-50 p-3">
              <strong>להגיש עד {dueLabel(report)}</strong>
              <span className="block text-sm">דוח מספר {report.number} מאז הצו, על {periodLabel(report)}</span>
            </li>)}
          </ol>
          {reports[0].number > 1 && <p className="text-sm">פספסתם דוח קודם? הגישו אותו בהקדם, ועדכנו את הנאמן או פנו למוקד הממונה בטלפון *5067.</p>}
          {stage === 'interim' && monthsSinceOrder >= 12 && <p className="text-sm text-amber-800">עברה יותר משנה מצו הפתיחה. אם כבר ניתן לכם צו לשיקום כלכלי, בחרו באפשרות השנייה למעלה.</p>}
        </>}
        <p className="text-sm text-gray-600">
          החישוב לפי הדוגמאות ב<a href={SCHEDULE_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline">דף השירות של הממונה</a>.
          אם בצו, בהחלטה או בהנחיה שקיבלתם נקבע מועד אחר — הוא הקובע.
        </p>
      </div>
    </section>

    <section className={cardClass} aria-labelledby="rh-docs">
      <h3 id="rh-docs" className="text-lg font-bold">2. מה לצרף לדוח?</h3>
      <fieldset className="space-y-2">
        <legend className="font-semibold">סמנו מה נכון לגביכם:</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {conditions.map(condition => <label key={condition.id} className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={situation[condition.id]} className="mt-1"
              onChange={event => setSituation(previous => ({ ...previous, [condition.id]: event.target.checked }))} />
            <span>{condition.label}</span>
          </label>)}
        </div>
      </fieldset>
      <div>
        <p className="font-semibold">הרשימה שלכם ({readyCount} מתוך {docs.length} מוכנים):</p>
        <ul className="mt-2 space-y-2">
          {docs.map(doc => <li key={doc}><label className="flex items-start gap-2">
            <input type="checkbox" checked={Boolean(ready[doc])} className="mt-1.5"
              onChange={event => setReady(previous => ({ ...previous, [doc]: event.target.checked }))} />
            <span className={ready[doc] ? 'text-gray-500 line-through' : ''}>{doc}</span>
          </label></li>)}
        </ul>
        {stage === 'rehab' && <p className="mt-2 text-sm text-gray-600">בתקופת השיקום הכלכלי אין צורך לצרף קבלות על קניות מזון ומוצרי צריכה. דוח חצי שנתי כולל בפועל שלושה דוחות דו־חודשיים.</p>}
        <p className="mt-2 text-sm text-gray-600">הרשימה מבוססת על דף השירות של הממונה ועל הטופס הרשמי. ייתכן שהנאמן או הממונה יבקשו מסמכים נוספים.</p>
      </div>
    </section>

    <section className={cardClass} aria-labelledby="rh-sum">
      <h3 id="rh-sum" className="text-lg font-bold">3. סיכום הסכומים לטופס</h3>
      <p className="text-sm">השורות כאן באותו סדר כמו בטופס הרשמי. הזינו סכום לכל חודש, וקבלו את שורת הסה״כ. אחר כך העתיקו את הסכומים לטופס. הטופס כולל את ההכנסות וההוצאות שלכם, של בן או בת הזוג, של הילדים הקטינים ושל מי שאתם מפרנסים.</p>
      <AmountTable title="הכנסות" lines={incomeLines} values={incomes} onChange={updateTable(setIncomes)} months={months} />
      <AmountTable title="הוצאות" lines={expenseLines} values={expenses} onChange={updateTable(setExpenses)} months={months} />
      {stage === 'rehab' && <p className="text-sm text-amber-800">בדוח חצי שנתי מגישים יחד שלושה דוחות כאלה, אחד לכל זוג חודשים. מלאו את הטבלה שלוש פעמים והעתיקו כל פעם לטופס נפרד.</p>}
      <p className="text-sm text-gray-600">בטופס יש כמה שורות ריקות להכנסות נוספות ולהוצאות נוספות. כאן מזינים את הסכום הכולל שלהן, ובטופס מפרטים כל אחת בשורה נפרדת.</p>
    </section>

    <section className={cardClass} aria-labelledby="rh-merge">
      <h3 id="rh-merge" className="text-lg font-bold">4. איחוד הטופס והמסמכים לקובץ PDF אחד</h3>
      <p className="text-sm">הממונה מבקש לסרוק את הדוח יחד עם כל המסמכים לקובץ PDF אחד, ברור וקריא. כאן אפשר לחבר קובצי PDF וצילומים מהטלפון לקובץ אחד, בסדר שתבחרו.</p>
      <p className="text-sm text-gray-600">סדר מומלץ: הטופס החתום, תלושי השכר, מסמכי הכנסות אחרות, ואחריהם מסמכי ההוצאות.</p>
      <div>
        <label htmlFor="rh-files" className="inline-block cursor-pointer rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-3 font-semibold text-blue-900">+ הוספת קבצים (PDF או תמונות)</label>
        <input id="rh-files" ref={fileInput} type="file" multiple accept="application/pdf,image/*" className="sr-only" onChange={event => addFiles(event.target.files)} />
      </div>
      {files.length > 0 && <ol className="space-y-2">
        {files.map((file, index) => <li key={`${file.name}-${file.size}-${file.lastModified}-${index}`} className="flex flex-wrap items-center gap-2 rounded-lg border p-2 text-sm">
          <span className="font-semibold">{index + 1}.</span>
          <span className="min-w-0 flex-1 break-all">{file.name}</span>
          <span className="text-gray-500">{formatSize(file.size)}</span>
          <button type="button" className={smallButtonClass} onClick={() => move(index, -1)} disabled={index === 0 || busy} aria-label={`הזזת ${file.name} למעלה`}>▲</button>
          <button type="button" className={smallButtonClass} onClick={() => move(index, 1)} disabled={index === files.length - 1 || busy} aria-label={`הזזת ${file.name} למטה`}>▼</button>
          <button type="button" className={smallButtonClass} onClick={() => { clearResult(); setFiles(previous => previous.filter((_, i) => i !== index)); }} disabled={busy} aria-label={`הסרת ${file.name}`}>✕</button>
        </li>)}
      </ol>}
      <div className="flex flex-wrap gap-3">
        <button type="button" className={buttonClass} onClick={merge} disabled={files.length === 0 || busy}>יצירת קובץ PDF אחד</button>
        <button type="button" className="rounded-lg border px-4 py-2.5" onClick={clearAll} disabled={busy}>ניקוי הכול</button>
      </div>
      <div aria-live="polite" className="space-y-2">
        {progress && <p>{progress}</p>}
        {mergeError && <p role="alert" className="text-red-800">{mergeError}</p>}
        {result && result.pages > 0 && <div className="space-y-2 rounded-lg bg-green-50 p-3">
          <p>הקובץ מוכן: {result.pages} עמודים, {formatSize(result.size)}.</p>
          <a href={result.url} download="doch-hachnasot-vehotzaot.pdf" className="inline-block rounded-lg bg-green-700 px-4 py-2.5 font-semibold text-white! no-underline!">הורדת הקובץ</a>
          <p className="text-sm">לפני ההגשה פתחו את הקובץ ובדקו שכל עמוד ברור וקריא ושלא חסר מסמך.</p>
          {result.size > 15 * 1024 * 1024 && <p className="text-sm text-amber-800">הקובץ גדול. אם מערכת ההגשה לא מקבלת אותו, אפשר לברר במוקד הממונה בטלפון *5067 איך להגיש.</p>}
        </div>}
        {result && result.skipped.length > 0 && <div role="alert" className="rounded-lg bg-amber-50 p-3 text-sm">
          <p className="font-semibold">קבצים שלא נכללו:</p>
          <ul className="list-disc ps-5">{result.skipped.map(item => <li key={item.name}>{item.name} — {item.reason}</li>)}</ul>
        </div>}
      </div>
    </section>
  </div>;
}
