import { FormEvent, useEffect, useMemo, useState } from 'react';

type DebtRangeValue = 'under_50k' | '50k_100k' | 'over_100k';

interface CalculationSummary {
  principal?: number;
  baseInterest?: number;
  penaltyTotal?: number;
  grandTotal?: number;
}

interface LeadCaptureFormProps {
  source?: string;
  calculation?: CalculationSummary | null;
  variant?: 'embedded' | 'compact';
  onSuccess?: () => void;
}

const debtRanges: Array<{ value: DebtRangeValue; label: string }> = [
  { value: 'under_50k', label: 'עד 50 אלף' },
  { value: '50k_100k', label: '50-100 אלף' },
  { value: 'over_100k', label: 'מעל 100 אלף' },
];

function rangeFromAmount(amount?: number): DebtRangeValue | '' {
  if (!amount || amount <= 0) return '';
  if (amount <= 50000) return 'under_50k';
  if (amount <= 100000) return '50k_100k';
  return 'over_100k';
}

function formatILS(amount?: number): string {
  if (!amount || amount <= 0) return '';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(amount);
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function LeadCaptureForm({
  source = 'lead-form',
  calculation,
  variant = 'embedded',
  onSuccess,
}: LeadCaptureFormProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [debtRange, setDebtRange] = useState<DebtRangeValue | ''>('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  useEffect(() => {
    const calculatedRange = rangeFromAmount(calculation?.grandTotal);
    if (calculatedRange && !debtRange) setDebtRange(calculatedRange);
  }, [calculation?.grandTotal, debtRange]);

  const containerClass = useMemo(() => {
    if (variant === 'compact') {
      return 'rounded-xl border border-blue-200 bg-white p-4 shadow-xl';
    }
    return 'rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-green-50 p-5 md:p-6 shadow-sm';
  }, [variant]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const normalizedPhone = phone.replace(/[^\d+]/g, '');
    if (fullName.trim().length < 2) {
      setError('צריך להזין שם מלא.');
      return;
    }
    if (normalizedPhone.length < 9 || normalizedPhone.length > 15) {
      setError('צריך להזין מספר טלפון תקין.');
      return;
    }
    if (!debtRange) {
      setError('צריך לבחור גובה חוב מוערך.');
      return;
    }

    setStatus('submitting');
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          debtRange,
          source,
          page: window.location.href,
          calculation,
          company,
          submittedAt: new Date().toISOString(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'לא הצלחנו לשלוח את הפרטים כרגע.');
      }

      window.gtag?.('event', 'lead_submit', {
        event_category: 'Lead',
        event_label: source,
        debt_range: debtRange,
      });

      setStatus('success');
      onSuccess?.();
    } catch (err) {
      setStatus('idle');
      setError(err instanceof Error ? err.message : 'לא הצלחנו לשלוח את הפרטים כרגע.');
    }
  }

  if (status === 'success') {
    return (
      <div className={`${containerClass} text-center`} dir="rtl">
        <p className="text-lg font-bold text-green-800 mb-2">הפרטים התקבלו.</p>
        <p className="text-sm text-gray-700 leading-relaxed">
          אחד מעורכי הדין מהרשת יקבל את הליד ויוכל לחזור אליך לבדיקת היתכנות ללא עלות.
        </p>
      </div>
    );
  }

  return (
    <section className={containerClass} dir="rtl" aria-label="טופס בדיקת חובות">
      <div className="mb-4">
        <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">בדיקה ללא עלות</p>
        <h2 className={variant === 'compact' ? 'text-lg font-bold text-brand-dark mb-2' : 'text-2xl font-bold text-brand-dark mb-2'}>
          רוצה למחוק את החובות ולצאת לדרך חדשה?
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          השאר פרטים עכשיו וקבל שיחת בדיקת היתכנות משפטית לתיק שלך
          (ללא עלות) מול עורך דין מוסמך מהרשת שלנו. אל תישאר לבד מול המערכת.
        </p>
        {calculation?.grandTotal && (
          <p className="mt-3 rounded-lg bg-white/80 border border-blue-100 px-3 py-2 text-sm text-gray-700">
            סה"כ משוער מהמחשבון: <strong>{formatILS(calculation.grandTotal)}</strong>
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="hidden" aria-hidden="true">
          <label htmlFor={`${source}-company`}>Company</label>
          <input
            id={`${source}-company`}
            type="text"
            value={company}
            onChange={event => setCompany(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor={`${source}-full-name`} className="block text-sm font-semibold text-gray-800 mb-1">
            שם מלא
          </label>
          <input
            id={`${source}-full-name`}
            type="text"
            value={fullName}
            onChange={event => setFullName(event.target.value)}
            autoComplete="name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div>
          <label htmlFor={`${source}-phone`} className="block text-sm font-semibold text-gray-800 mb-1">
            מספר טלפון
          </label>
          <input
            id={`${source}-phone`}
            type="tel"
            inputMode="tel"
            dir="ltr"
            value={phone}
            onChange={event => setPhone(event.target.value)}
            autoComplete="tel"
            placeholder="05X-XXXXXXX"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base text-left focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <fieldset>
          <legend className="block text-sm font-semibold text-gray-800 mb-2">גובה החוב המוערך</legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {debtRanges.map(range => (
              <label
                key={range.value}
                className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-semibold transition-colors ${
                  debtRange === range.value
                    ? 'border-blue-700 bg-blue-700 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-500'
                }`}
              >
                <input
                  type="radio"
                  name={`${source}-debt-range`}
                  value={range.value}
                  checked={debtRange === range.value}
                  onChange={() => setDebtRange(range.value)}
                  className="sr-only"
                />
                {range.label}
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full rounded-lg bg-green-700 px-4 py-3 text-base font-bold text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === 'submitting' ? 'שולח...' : 'אני רוצה בדיקה חינם'}
        </button>

        <p className="text-xs text-gray-600 leading-relaxed">
          בלחיצה על הכפתור אני מאשר/ת שהפרטים שמסרתי יועברו לעורך דין מהרשת לצורך יצירת קשר ובדיקת
          היתכנות ראשונית, בהתאם ל
          <a href="/legal/privacy/" className="underline hover:text-blue-700">מדיניות הפרטיות</a>.
          מסירת הפרטים אינה יוצרת יחסי עורך דין-לקוח, אין התחייבות למחיקת חובות או לתוצאה משפטית,
          והמידע אינו מחליף ייעוץ משפטי אישי.
        </p>
      </form>
    </section>
  );
}
