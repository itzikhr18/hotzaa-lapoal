import { useState, useCallback } from 'react';
import LeadCaptureForm from './LeadCaptureForm';

// ── "הריבית השקלית" לפי תיקון 9, לפי רבעונים ──────────────────────────────
// זהו שיעור הבסיס הרשמי שמפרסם החשב הכללי מדי רבעון (מבוסס על ריבית העוגן
// על האשראי במערכת הבנקאית). המקור הרשמי: https://ga.mof.gov.il/rate
// נתון מאומת: Q4 2025 = 6.23% (דמי פיגורים 5.12%). שאר הרבעונים מקורבים כ-
// ריבית בנק ישראל + 2.0% (הפער שאומת מול הנתון הרשמי; ~prime + 0.5%).
const SHEKEL_RATE: Record<string, number> = {
  '2025-Q1': 0.065, // ≈ BoI 4.5% + 2.0%
  '2025-Q2': 0.065,
  '2025-Q3': 0.065,
  '2025-Q4': 0.0623, // מאומת מול ga.mof.gov.il (BoI ירדה ל-4.25% ב-24/11)
  '2026-Q1': 0.060, // ≈ BoI 4.0% + 2.0%
  '2026-Q2': 0.0575, // ≈ BoI 3.75% + 2.0%
  '2026-Q3': 0.055,  // ≈ BoI 3.5% + 2.0% (BoI ירדה ל-3.5% ב-6/7/2026)
  '2026-Q4': 0.055,  // עדכן לפי ga.mof.gov.il אחרי פרסום הרבעון
};
// אומת מול ga.mof.gov.il ביולי 2026 (Q4 2025 מדויק; השאר מקורב BoI+2%).
const RATES_LAST_VERIFIED = 'יולי 2026'; // עדכן יחד עם SHEKEL_RATE כל רבעון
const LAST_KNOWN_RATE = 0.055; // לרבעונים עתידיים שטרם פורסמו
// דמי פיגורים לפי תיקון 9: השיעור השנתי = מחצית הריבית השקלית (בעיגול ל-0.1%)
// בתוספת 2 נקודות אחוז; נצברים אחת לרבעון (רבע מהשיעור השנתי), החל מ-3 חודשי פיגור.
// חייב שעומד בצו תשלומים אינו צובר דמי פיגורים כלל.
const OLD_LAW_RATE = 0.0873; // ריבית פיגורים צמודה לפני 2025 (~8.73% + הצמדה למדד, ריבית דריבית)

function getQuarter(date: Date): string {
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-Q${q}`;
}

// מחזירה את הריבית השקלית של אותו רבעון (שיעור הבסיס)
function getRateForDate(date: Date): number {
  const key = getQuarter(date);
  return SHEKEL_RATE[key] ?? LAST_KNOWN_RATE;
}

// השיעור השנתי של דמי הפיגורים לפי הריבית השקלית של אותו רבעון
function penaltyAnnualRate(shekelRate: number): number {
  return Math.round((shekelRate / 2) * 1000) / 1000 + 0.02;
}

const CUT_DATE = new Date('2025-01-01');

function formatILS(n: number): string {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);
}

interface Row {
  period: string;
  baseInterest: number;
  penalty: number;
  total: number;
}

export default function InterestCalculator() {
  const [principal, setPrincipal] = useState('');
  const [debtDate, setDebtDate] = useState('');
  const [calcDate, setCalcDate] = useState(new Date().toISOString().split('T')[0]);
  const [compliant, setCompliant] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<null | {
    principal: number;
    baseInterest: number;
    penaltyTotal: number;
    grandTotal: number;
    rows: Row[];
  }>(null);

  const calculate = useCallback(() => {
    const p = parseFloat(principal.replace(/,/g, ''));
    if (!p || p <= 0) { setError('הזן את סכום קרן החוב (מספר גדול מאפס).'); setResult(null); return; }
    if (!debtDate)     { setError('בחר את תאריך יצירת החוב.'); setResult(null); return; }
    if (!calcDate)     { setError('בחר את תאריך החישוב.'); setResult(null); return; }

    const start = new Date(debtDate);
    const end   = new Date(calcDate);
    if (end <= start) { setError('תאריך החישוב חייב להיות מאוחר מתאריך יצירת החוב.'); setResult(null); return; }
    setError('');

    let balance = p;
    let totalBase = 0;
    let totalPenalty = 0;
    const rows: Row[] = [];

    // iterate quarter by quarter
    let cur = new Date(start);
    let newLawQuarters = 0; // דמי פיגורים מתחילים רק אחרי 3 חודשי פיגור
    while (cur < end) {
      const qEnd = new Date(cur);
      qEnd.setMonth(qEnd.getMonth() + 3);
      const periodEnd = qEnd < end ? qEnd : end;

      const days = (periodEnd.getTime() - cur.getTime()) / 86400000;
      const isNewLaw = cur >= CUT_DATE;

      if (isNewLaw) {
        // תיקון 9: הריבית השקלית של אותו רבעון על היתרה
        const shekelRate = getRateForDate(cur);
        const baseInt = balance * shekelRate * (days / 365);
        balance += baseInt;
        totalBase += baseInt;

        // דמי פיגורים: רבע מהשיעור השנתי (מחצית הריבית השקלית + 2%) לכל רבעון,
        // החל מהרבעון השני של הפיגור. חייב שעומד בצו תשלומים אינו צובר כלל.
        newLawQuarters += 1;
        let actualPenalty = 0;
        if (!compliant && newLawQuarters > 1) {
          actualPenalty = p * (penaltyAnnualRate(shekelRate) / 4) * (days / 91);
        }
        totalPenalty += actualPenalty;

        rows.push({
          period: `Q${Math.floor(cur.getMonth() / 3) + 1}/${cur.getFullYear()}`,
          baseInterest: Math.round(baseInt),
          penalty: Math.round(actualPenalty),
          total: Math.round(balance + totalPenalty),
        });
      } else {
        // לפני 2025: ריבית פיגורים צמודה (~8.73% + הצמדה), ריבית דריבית
        const int = balance * OLD_LAW_RATE * (days / 365);
        balance += int;
        totalBase += int;
        rows.push({
          period: `Q${Math.floor(cur.getMonth() / 3) + 1}/${cur.getFullYear()}`,
          baseInterest: Math.round(int),
          penalty: 0,
          total: Math.round(balance),
        });
      }

      cur = qEnd;
    }

    const grandTotal = Math.round(balance + totalPenalty);
    setResult({ principal: p, baseInterest: Math.round(totalBase), penaltyTotal: Math.round(totalPenalty), grandTotal, rows });
  }, [principal, debtDate, calcDate, compliant]);

  return (
    <div dir="rtl" className="font-sans">

      {/* Input form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="calc-principal" className="block text-sm font-semibold text-gray-700 mb-1">סכום קרן החוב (₪)</label>
          <input
            id="calc-principal"
            type="text"
            inputMode="numeric"
            value={principal}
            onChange={e => setPrincipal(e.target.value)}
            placeholder="למשל: 50000"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="calc-debt-date" className="block text-sm font-semibold text-gray-700 mb-1">תאריך יצירת החוב</label>
          <input
            id="calc-debt-date"
            type="date"
            value={debtDate}
            onChange={e => setDebtDate(e.target.value)}
            max={calcDate}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="calc-date" className="block text-sm font-semibold text-gray-700 mb-1">תאריך חישוב</label>
          <input
            id="calc-date"
            type="date"
            value={calcDate}
            onChange={e => setCalcDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 mt-4">
          <input
            id="compliant"
            type="checkbox"
            checked={compliant}
            onChange={e => setCompliant(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
          <label htmlFor="compliant" className="text-sm text-gray-700">
            אני עומד בצו תשלומים (לא נצברים דמי פיגורים)
          </label>
        </div>
      </div>

      <button
        onClick={calculate}
        className="w-full md:w-auto bg-blue-700 hover:bg-blue-800 text-white font-bold px-8 py-3 rounded-lg transition-colors text-base"
      >
        חשב חוב עכשיו
      </button>

      {error && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">
          ⚠️ {error}
        </p>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-gray-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mt-4">
        ⚠️ מחשבון זה מיועד להערכה בלבד. לחישוב מדויק — פנה לעורך דין או לרשות האכיפה והגבייה.
      </p>
      <p className="text-xs text-gray-500 mt-2">
        השיעורים במחשבון עודכנו: {RATES_LAST_VERIFIED}. "הריבית השקלית" (שיעור הבסיס)
        מתפרסמת רשמית מדי רבעון ע"י החשב הכללי — במחשבון היא מקורבת (פרט לרבעון מאומת אחד)
        כריבית בנק ישראל + 2%. לשיעור הרשמי המדויק —{' '}
        <a href="https://ga.mof.gov.il/rate" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-700">
          פרסומי החשב הכללי (ga.mof.gov.il)
        </a>.
      </p>

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-6">

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'קרן מקורית', value: formatILS(result.principal), color: 'bg-gray-50 border-gray-200' },
              { label: 'ריבית בסיס', value: formatILS(result.baseInterest), color: 'bg-blue-50 border-blue-200' },
              { label: 'דמי פיגורים', value: formatILS(result.penaltyTotal), color: 'bg-orange-50 border-orange-200' },
              { label: 'סה"כ לתשלום', value: formatILS(result.grandTotal), color: 'bg-red-50 border-red-200 font-bold' },
            ].map(c => (
              <div key={c.label} className={`border rounded-xl p-4 text-center ${c.color}`}>
                <div className="text-xs text-gray-500 mb-1">{c.label}</div>
                <div className="text-xl font-bold text-gray-800">{c.value}</div>
              </div>
            ))}
          </div>

          <LeadCaptureForm
            source="calculator-result"
            calculation={{
              principal: result.principal,
              baseInterest: result.baseInterest,
              penaltyTotal: result.penaltyTotal,
              grandTotal: result.grandTotal,
            }}
          />

          {/* Quarterly table */}
          <div className="overflow-x-auto">
            <h3 className="text-base font-bold text-gray-700 mb-3">פירוט רבעוני</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th scope="col" className="text-right p-2 border border-gray-200">רבעון</th>
                  <th scope="col" className="text-right p-2 border border-gray-200 text-blue-700">ריבית בסיס</th>
                  <th scope="col" className="text-right p-2 border border-gray-200 text-orange-700">דמי פיגורים</th>
                  <th scope="col" className="text-right p-2 border border-gray-200">סה"כ מצטבר</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-2 border border-gray-200">{row.period}</td>
                    <td className="p-2 border border-gray-200 text-blue-700">{formatILS(row.baseInterest)}</td>
                    <td className="p-2 border border-gray-200 text-orange-700">{formatILS(row.penalty)}</td>
                    <td className="p-2 border border-gray-200 font-semibold">{formatILS(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
