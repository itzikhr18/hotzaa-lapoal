import { useState, useCallback } from 'react';
import { wageList, WAGE_AS_OF } from '../data/protected-amounts';

// כללי עיקול משכורת (סעיף 8 לחוק הגנת השכר, תשי"ח-1958; מקור: כל-זכות):
// - שכר נטו שאינו עולה על הסכום המוגן (לפי הרכב המשפחה) — לא ניתן לעקל כלל.
// - אם הסכום המוגן נמוך מ-80% מהנטו — משאירים בידי החייב את הסכום המוגן,
//   וכל יתרת השכר ניתנת לעיקול.
// - אם הסכום המוגן הוא בין 80% ל-100% מהנטו — מעקלים 20% מהנטו בלבד
//   (תמיד נשארים בידי החייב לפחות 80% מהנטו).
// - בתיקי מזונות ההגנה אינה חלה כלל.
const MAX_EXEMPT_SHARE = 0.8;

function formatILS(n: number): string {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);
}

interface Result {
  net: number;
  protectedWage: number;
  familyLabel: string;
  exempt: number;
  deduction: number;
  remaining: number;
  fullyProtected: boolean;
  cappedAt80: boolean;
}

export default function SalaryGarnishmentCalculator() {
  const [netSalary, setNetSalary] = useState('');
  const [family, setFamily] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  const calculate = useCallback(() => {
    const net = parseFloat(netSalary.replace(/,/g, ''));
    if (!net || net <= 0) return;

    const { label: familyLabel, amount: protectedWage } = wageList[family];

    let deduction: number;
    let exempt: number;
    let cappedAt80 = false;

    if (net <= protectedWage) {
      // כל השכר נמוך מהסכום המוגן — מוגן במלואו
      exempt = net;
      deduction = 0;
    } else if (protectedWage < net * MAX_EXEMPT_SHARE) {
      // הסכום המוגן נמוך מ-80% מהנטו — נשאר הסכום המוגן, היתרה ניתנת לעיקול
      exempt = protectedWage;
      deduction = net - protectedWage;
    } else {
      // הסכום המוגן בין 80% ל-100% מהנטו — מעקלים 20% מהנטו
      exempt = net * MAX_EXEMPT_SHARE;
      deduction = net * (1 - MAX_EXEMPT_SHARE);
      cappedAt80 = true;
    }

    setResult({
      net,
      protectedWage,
      familyLabel,
      exempt: Math.round(exempt),
      deduction: Math.round(deduction),
      remaining: Math.round(net - deduction),
      fullyProtected: deduction === 0,
      cappedAt80,
    });
  }, [netSalary, family]);

  return (
    <div dir="rtl" className="font-sans">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="sg-net" className="block text-sm font-semibold text-gray-700 mb-1">
            משכורת נטו בחודש (₪)
          </label>
          <input
            id="sg-net"
            type="text"
            inputMode="numeric"
            value={netSalary}
            onChange={e => setNetSalary(e.target.value)}
            placeholder="למשל: 8500"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">הנטו בתלוש — אחרי ניכויי חובה, לפני ניכויים רצוניים</p>
        </div>

        <div>
          <label htmlFor="sg-family" className="block text-sm font-semibold text-gray-700 mb-1">
            הרכב המשפחה
          </label>
          <select
            id="sg-family"
            value={family}
            onChange={e => setFamily(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {wageList.map((w, i) => (
              <option key={w.label} value={i}>
                {w.label} — סכום מוגן {formatILS(w.amount)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={calculate}
        className="w-full md:w-auto bg-blue-700 hover:bg-blue-800 text-white font-bold px-8 py-3 rounded-lg transition-colors text-base"
      >
        חשב כמה מותר לעקל
      </button>

      <p className="text-xs text-gray-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mt-4">
        ⚠️ המחשבון מיועד להערכה בלבד ואינו חל על תיקי מזונות (שם ההגנה אינה חלה).
        בפועל ניתן לבקש מרשם ההוצאה לפועל הפחתה של שיעור העיקול או צו תשלומים.
        הסכומים המוגנים מעודכנים ל-{WAGE_AS_OF}. לעובד בשכר יומי הסכום המוגן ליום
        הוא 1/25 מהסכום החודשי.
      </p>

      {result && (
        <div className="mt-8 space-y-5">

          {result.fullyProtected ? (
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-5">
              <p className="text-lg font-bold text-green-800 mb-1">✅ המשכורת שלך מוגנת מעיקול</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                המשכורת נטו שלך ({formatILS(result.net)}) אינה עולה על הסכום המוגן עבור
                {' '}{result.familyLabel} ({formatILS(result.protectedWage)}) — לכן לא ניתן לעקל ממנה כלל
                (למעט תיקי מזונות). אם בכל זאת מנכים לך —{' '}
                <a href="/guides/ikul-maskoret/" className="text-brand underline font-semibold">הגש בקשת ביטול לרשם</a>{' '}
                וצרף תלוש שכר.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'ניתן לעקל עד', value: formatILS(result.deduction), color: 'bg-red-50 border-red-200' },
                  { label: 'חייב להישאר בידך לפחות', value: formatILS(result.remaining), color: 'bg-green-50 border-green-200' },
                  { label: `סכום מוגן (${result.familyLabel})`, value: formatILS(result.protectedWage), color: 'bg-gray-50 border-gray-200' },
                ].map(c => (
                  <div key={c.label} className={`border rounded-xl p-4 text-center ${c.color}`}>
                    <div className="text-xs text-gray-500 mb-1">{c.label}</div>
                    <div className="text-xl font-bold text-gray-800">{c.value}</div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 space-y-2">
                <p className="font-semibold text-gray-800">איך חושב הסכום?</p>
                {result.cappedAt80 ? (
                  <>
                    <p>
                      הסכום המוגן ({formatILS(result.protectedWage)}) גבוה מ-80% מהנטו שלך
                      ({formatILS(Math.round(result.net * MAX_EXEMPT_SHARE))}) — במקרה כזה החוק קובע
                      שנשארים בידיך 80% מהנטו, וניתן לעקל 20%.
                    </p>
                    <p>
                      עיקול מקסימלי: 20% × {formatILS(result.net)} = <strong>{formatILS(result.deduction)}</strong>
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      הסכום המוגן ({formatILS(result.protectedWage)}) נמוך מ-80% מהנטו שלך — במקרה כזה
                      החוק קובע שנשאר בידיך הסכום המוגן, וכל היתרה ניתנת לעיקול.
                    </p>
                    <p>
                      עיקול מקסימלי: {formatILS(result.net)} − {formatILS(result.protectedWage)} = <strong>{formatILS(result.deduction)}</strong>
                    </p>
                  </>
                )}
                <p className="text-xs text-gray-500">
                  זהו המקסימום המותר בחוק. בפועל, גובה העיקול נקבע בצו של רשם ההוצאה לפועל —
                  וניתן לבקש הפחתה משמעותית לפי הוצאות המחיה שלך, או צו תשלומים שמחליף את העיקול.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-gray-700">
                💡 <strong>העיקול כבד מדי או שגוי?</strong> ניתן לפנות לרשם ההוצאה לפועל בבקשת
                הפחתה, ביטול או צו תשלומים —{' '}
                <a href="/tools/noseach-bakasha/" className="text-brand underline font-semibold">הכן נוסח בקשה בחינם</a>{' '}
                או קרא את <a href="/guides/ikul-maskoret/" className="text-brand underline">המדריך המלא לעיקול משכורת</a>.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
