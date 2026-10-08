// מועדי הגשת דוח הכנסות והוצאות בהליך חדלות פירעון של יחיד, לפי דף השירות של הממונה
// (נבדק 08.10.2026). הדוגמאות בדף: צו פתיחה ב־10.08 → דוח ראשון עד 15.10 על אוגוסט וספטמבר;
// צו שיקום ב־10.2 → דוח ראשון עד 15.8 על פברואר עד יולי. החישוב לפי חודשים בלבד.

export const SCHEDULE_SOURCE_URL = 'https://www.gov.il/he/service/bi_monthly_report_about_incomes';
export const DUE_DAY = 15;
export const FIRST_ORDER_YEAR = 2019;

export const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

/** @typedef {'interim' | 'rehab'} Stage */

/** @param {Stage} stage */
export const stepFor = stage => (stage === 'rehab' ? 6 : 2);

const fromIndex = index => ({ year: Math.floor(index / 12), month: index % 12 });

/** @param {{ year: number, month: number }} value month is 0-based */
export const monthName = ({ year, month }) => `${HEBREW_MONTHS[month]} ${year}`;

/**
 * Report number k (starting at 1) for an order given in orderMonth/orderYear (month 0-based).
 * @param {{ stage: Stage, orderYear: number, orderMonth: number, k: number }} input
 */
export function reportAt({ stage, orderYear, orderMonth, k }) {
  const step = stepFor(stage);
  const start = orderYear * 12 + orderMonth + step * (k - 1);
  return {
    number: k,
    due: { ...fromIndex(start + step), day: DUE_DAY },
    from: fromIndex(start),
    to: fromIndex(start + step - 1),
  };
}

/** @param {{ stage: Stage, orderYear: number, orderMonth: number, today?: Date }} input */
export function isValidOrder({ stage, orderYear, orderMonth, today = new Date() }) {
  if (stage !== 'interim' && stage !== 'rehab') return false;
  if (!Number.isInteger(orderYear) || !Number.isInteger(orderMonth)) return false;
  if (orderMonth < 0 || orderMonth > 11 || orderYear < FIRST_ORDER_YEAR) return false;
  return orderYear * 12 + orderMonth <= today.getFullYear() * 12 + today.getMonth();
}

/**
 * The next reports whose due date (the 15th) has not passed yet, counted from today.
 * @param {{ stage: Stage, orderYear: number, orderMonth: number, today?: Date, count?: number }} input
 */
export function upcomingReports({ stage, orderYear, orderMonth, today = new Date(), count = 3 }) {
  if (!isValidOrder({ stage, orderYear, orderMonth, today })) return [];
  const todayKey = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const result = [];
  for (let k = 1; k <= 400 && result.length < count; k += 1) {
    const report = reportAt({ stage, orderYear, orderMonth, k });
    const dueKey = report.due.year * 10000 + (report.due.month + 1) * 100 + report.due.day;
    if (dueKey >= todayKey) result.push(report);
  }
  return result;
}

/** @param {{ due: { year: number, month: number, day: number } }} report */
export const dueLabel = report => `${report.due.day} ב${monthName(report.due)}`;

/** @param {{ from: { year: number, month: number }, to: { year: number, month: number } }} report */
export const periodLabel = report => (report.from.year === report.to.year
  ? `${HEBREW_MONTHS[report.from.month]}–${HEBREW_MONTHS[report.to.month]} ${report.to.year}`
  : `${monthName(report.from)} – ${monthName(report.to)}`);
