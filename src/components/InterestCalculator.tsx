import { useState, useCallback } from 'react';

// ── ריבית בנק ישראל לפי רבעונים — עדכן כשבנק ישראל מחליט ──────────────────
// המקור: https://www.boi.org.il (החלטות הוועדה המוניטרית)
// RATES מכיל את ריבית בנק ישראל בלבד; הפונקציה מוסיפה 3.5% spread לתיקון 9
const RATES: Record<string, number> = {
  '2025-Q1': 0.045, // BoI 4.5%
  '2025-Q2': 0.045, // BoI 4.5%
  '2025-Q3': 0.045, // BoI 4.5% (אושר ב-29/9/2025)
  '2025-Q4': 0.045, // BoI 4.5% עד 24/11 → 4.25% (הרוב הרבעון ב-4.5%)
  '2026-Q1': 0.040, // BoI 4.0% (הפחתה 5/1/2026; הוחזק ב-23/2 וב-30/3)
  '2026-Q2': 0.0375, // BoI 3.75% (הופחת מ-4.0% ב-25/5/2026)
  '2026-Q3': 0.0375, // BoI 3.75% — תקף עד החלטת הריבית הבאה (6/7/2026)
  '2026-Q4': 0.0375, // עדכן אחרי החלטות הריבית של 7-12/2026
};
// אומת מול בנק ישראל ביוני 2026. החלטת הריבית הבאה: 6/7/2026 — לעדכן את RATES אחריה.
const RATES_LAST_VERIFIED = 'יוני 2026'; // עדכן יחד עם RATES אחרי כל החלטת ריבית
const PENALTY_RATE_NEW = 0.0025; // 0.25% לרבעון (1% בשנה) — דמי פיגורים תיקון 9
const NEW_LAW_SPREAD = 0.035;   // 3.5% spread מעל ריבית בנק ישראל — ריבית בסיס תיקון 9
const PENALTY_CAP_COMPLIANT = 0.70; // תקרה לחייב עומד בצו תשלומים
const PENALTY_CAP_DEFAULT   = 0.80;
const CUT_DATE = new Date('2025-01-01');

function getQuarter(date: Date): string {
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-Q${q}`;
}

function getRateForDate(date: Date): number {
  const key = getQuarter(date);
  return RATES[key] ?? 0.043;
}

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
  const [result, setResult] = useState<null | {
    principal: number;
    baseInterest: number;
    penaltyTotal: number;
    grandTotal: number;
    rows: Row[];
  }>(null);

  const calculate = useCallback(() => {
    const p = parseFloat(principal.replace(/,/g, ''));
    if (!p || !debtDate || !calcDate) return;

    const start = new Date(debtDate);
    const end   = new Date(calcDate);
    if (end <= start) return;

    let balance = p;
    let totalBase = 0;
    let totalPenalty = 0;
    const rows: Row[] = [];

    // iterate quarter by quarter
    let cur = new Date(start);
    while (cur < end) {
      const qEnd = new Date(cur);
      qEnd.setMonth(qEnd.getMonth() + 3);
      const periodEnd = qEnd < end ? qEnd : end;

      const days = (periodEnd.getTime() - cur.getTime()) / 86400000;
      const annualRate = getRateForDate(cur);
      const isNewLaw = cur >= CUT_DATE;

      if (isNewLaw) {
        // תיקון 9: ריבית בסיס = BoI + 3.5%, על קרן + ריבית בסיס מצטברת בלבד
        const baseInt = balance * (annualRate + NEW_LAW_SPREAD) * (days / 365);
        balance += baseInt;
        totalBase += baseInt;

        // דמי פיגורים: רבעוניים, לא מצטברים לקרן
        const penalty = p * PENALTY_RATE_NEW;
        const cap = p * (compliant ? PENALTY_CAP_COMPLIANT : PENALTY_CAP_DEFAULT);
        const actualPenalty = Math.min(totalPenalty + penalty, cap) - totalPenalty;
        totalPenalty += actualPenalty;

        rows.push({
          period: `Q${Math.floor(cur.getMonth() / 3) + 1}/${cur.getFullYear()}`,
          baseInterest: Math.round(baseInt),
          penalty: Math.round(actualPenalty),
          total: Math.round(balance + totalPenalty),
        });
      } else {
        // חוק ישן: ריבית דריבית + קנס 25%
        const rate = getRateForDate(cur) + 0.01; // historic spread
        const int = balance * rate * (days / 365);
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
            אני עומד בצו תשלומים (תקרת פיגורים 70%)
          </label>
        </div>
      </div>

      <button
        onClick={calculate}
        className="w-full md:w-auto bg-blue-700 hover:bg-blue-800 text-white font-bold px-8 py-3 rounded-lg transition-colors text-base"
      >
        חשב חוב עכשיו
      </button>

      {/* Disclaimer */}
      <p className="text-xs text-gray-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mt-4">
        ⚠️ מחשבון זה מיועד להערכה בלבד. לחישוב מדויק — פנה לעורך דין או לרשות האכיפה והגבייה.
      </p>
      <p className="text-xs text-gray-500 mt-2">
        ריבית בנק ישראל במחשבון מעודכנת להחלטה האחרונה: {RATES_LAST_VERIFIED}.
        ריביות מתעדכנות לאחר כל החלטת ועדה מוניטרית —{' '}
        <a href="https://www.boi.org.il" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-700">
          בדוק את הריבית הנוכחית באתר בנק ישראל
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
