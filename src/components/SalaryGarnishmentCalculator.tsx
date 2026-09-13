import { useState } from 'react';
import { wageList, illustrateMonthlyWage, WAGE_LAW_URL, WAGE_SOURCE_URL } from '../data/protected-amounts';

const money = (n: number) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 2 }).format(n);

export default function SalaryGarnishmentCalculator() {
  const [salary, setSalary] = useState('');
  const [family, setFamily] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ net: number; base: number; exempt: number; remainder: number } | null>(null);
  const clearResult = () => { setResult(null); setError(''); };

  function calculate() {
    setResult(null);
    const normalized = salary.trim().replace(/,/g, '');
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
      setError('יש להזין סכום חיובי בשקלים, עם עד שתי ספרות אחרי הנקודה.');
      return;
    }
    const net = Number(normalized);
    const base = wageList[family]?.amount;
    const calculation = base === undefined ? null : illustrateMonthlyWage(net, base);
    if (!confirmed || base === undefined || !calculation) {
      setError('יש לאשר שהמקרה מתאים לתנאי ההדגמה ולהזין שכר חיובי עד מיליון ₪. במקרה אחר יש לפנות לבירור פרטני.');
      return;
    }
    setError('');
    setResult({ net, base, ...calculation });
  }

  return <div dir="rtl" className="space-y-5">
    <p className="rounded-lg bg-amber-50 p-4 text-sm">
      הדגמה לשכר חודשי המשולם בספטמבר 2026, לפי סכומי הבסיס שהיו בתוקף באוגוסט 2026.
      היא אינה מיועדת לחוב מזונות, שכר יומי, צירוף הכנסות ממספר משלמים, כספי פנסיה או מקרה שבו הרכב המשפחה טעון בירור.
      לחודש תשלום אחר יש לאמת מחדש את הסכומים; הכלי אינו מתעדכן אוטומטית.
    </p>
    <div>
      <label htmlFor="sg-net" className="block font-semibold mb-1">שכר חודשי לאחר ניכויי חובה על פי חיקוק (₪)</label>
      <input id="sg-net" type="text" inputMode="decimal" value={salary}
        onChange={e => { setSalary(e.target.value); clearResult(); }}
        aria-describedby="sg-salary-help" className="w-full border rounded-lg px-3 py-2" />
      <p id="sg-salary-help" className="text-sm">לא בהכרח הנטו שהועבר לבנק: אין להפחית ניכויים רצוניים או החזר הלוואה כאילו היו ניכויי חובה בחוק.</p>
    </div>
    <div>
      <label htmlFor="sg-family" className="block font-semibold mb-1">הרכב משפחה לפי הגדרות הבטחת הכנסה</label>
      <select id="sg-family" value={family} onChange={e => { setFamily(Number(e.target.value)); clearResult(); }} className="w-full border rounded-lg px-3 py-2 bg-white">
        {wageList.map((item, index) => <option key={item.label} value={index}>{item.label}</option>)}
      </select>
      <p className="text-sm">הגדרות ילד, בני זוג והורה עצמאי הן הגדרות משפטיות. <a href={WAGE_SOURCE_URL} className="underline">בדקו אותן במקור הרשמי</a>.</p>
    </div>
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" checked={confirmed} onChange={e => { setConfirmed(e.target.checked); clearResult(); }} className="mt-1" />
      <span>אישרתי שמדובר בשכר חודשי ממשלם אחד, המשולם בספטמבר 2026, בחוב שאינו מזונות, ושהרכב המשפחה שבחרתי מתאים להגדרות.</span>
    </label>
    <button type="button" onClick={calculate} className="bg-blue-700 text-white rounded-lg px-5 py-3 font-semibold">הצגת הדגמת החישוב</button>
    {error && <p role="alert" className="text-red-800">{error}</p>}
    <div aria-live="polite">
      {result && <section className="border rounded-xl p-4 space-y-3" aria-label="הדגמת החישוב">
        <h2 className="text-lg font-bold">הדגמה לפי סעיף 8 — לא החלטה בתיק</h2>
        <p>סכום הבסיס: {money(result.base)}. שמונים אחוזים מהשכר: {money(result.net * 0.8)}.</p>
        <p>החלק המוגן בהדגמה, הנמוך מביניהם: <strong>{money(result.exempt)}</strong>.</p>
        <p>יתרת השכר שאינה מוגנת מכוח כלל זה: <strong>{money(result.remainder)}</strong>.</p>
        <p className="text-sm">היתרה אינה הוראה לנכות סכום זה: יש לבדוק את הצו, יתרת החוב, מקור הכסף, הגנות נוספות ונסיבות המקרה. עיגול התצוגה לאגורות הוא לצורך המחשה בלבד.</p>
        <p className="text-sm">שכר הנמוך מסכום הבסיס אינו פטור אוטומטית; במקרה זה ההגנה עשויה להיות 80% ממנו. בשכר גבוה יותר היתרה עשויה לעלות על 20%.</p>
      </section>}
    </div>
    <p className="text-sm">מקור הכלל: <a href={WAGE_LAW_URL} className="underline">סעיף 8 לחוק הגנת השכר</a>. אם העיקול שגוי, <a href="/guides/ikul-maskoret/" className="underline">בדקו כיצד מבקשים ביטול או עיכוב</a>. עצם הבקשה אינה מבטלת את העיקול.</p>
  </div>;
}
