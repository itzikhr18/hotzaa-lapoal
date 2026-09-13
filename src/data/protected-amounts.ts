/**
 * סכומי בסיס לחישוב סעיף 8 לחוק הגנת השכר — לא רצפה מובטחת.
 *
 * ⚠️ מקור אמת יחיד: עדכון שנתי של הסכומים מתבצע כאן בלבד —
 * כל העמודים (טבלאות, רשימות, תשובות FAQ וסכמות) נבנים מהקובץ הזה.
 * מקור: טבלת ביטוח לאומי מ-01.01.2026, קבוצת גיל 55 ומעלה,
 * בהתאם להפניה לטור ג' בתוספת השנייה לחוק הבטחת הכנסה.
 * זו אינה דרישת גיל מהעובד. יש לאמת הרכב משפחה ואת הסכום בחודש
 * שקדם לתשלום השכר. חריג מזונות: סעיף 8(ב).
 */
export const WAGE_AS_OF = '2026';
export const WAGE_VERIFIED_ON = '2026-09-13';
export const WAGE_LAW_URL = 'https://www.btl.gov.il/Laws1/00_0106_000000.pdf';
export const WAGE_INCOME_LAW_URL = 'https://www.btl.gov.il/Laws1/00_0002_000000.pdf';
export const WAGE_SOURCE_URL = 'https://www.btl.gov.il/benefits/Income_support/Pages/%D7%A1%D7%9B%D7%95%D7%9E%D7%99%20%D7%94%D7%A7%D7%A6%D7%91%D7%94.aspx';
export const WAGE_RULE_TEXT = 'בחוב שאינו מזונות, ההגנה על שכר חודשי היא הנמוך מבין סכום הבסיס לפי הרכב המשפחה לבין 80% מהשכר לאחר ניכויי חובה על פי חיקוק. גם שכר נמוך אינו מוגן בהכרח במלואו, ו-20% אינם תקרת עיקול כללית.';

export const wage = {
  single: 2596,
  couple: 3893,
  couplePlusChild: 4516,
  couplePlus2: 5139,
  singleParentPlusChild: 4250,
  singleParentPlus2: 5289,
} as const;

export const fmtILS = (n: number): string => `${n.toLocaleString('he-IL')} ₪`;

/** רשימה לטבלאות ולרשימות מפורטות */
export const wageList = [
  { label: 'יחיד', amount: wage.single },
  { label: 'זוג ללא ילדים', amount: wage.couple },
  { label: 'זוג + ילד 1', amount: wage.couplePlusChild },
  { label: 'זוג + 2 ילדים ומעלה', amount: wage.couplePlus2 },
  { label: 'הורה יחיד + ילד 1', amount: wage.singleParentPlusChild },
  { label: 'הורה יחיד + 2 ילדים ומעלה', amount: wage.singleParentPlus2 },
];

/** טווח קצר לשימוש בתוך משפט: "2,596-5,289 ₪" */
export const wageRangeText = `${wage.single.toLocaleString('he-IL')}-${wage.singleParentPlus2.toLocaleString('he-IL')} ₪`;

/** המשפט הקנוני המלא, כולל שנת העדכון */
export const wageSentence = `יחיד כ-${fmtILS(wage.single)}, זוג ${fmtILS(wage.couple)}, זוג + ילד ${fmtILS(wage.couplePlusChild)}, זוג + 2+ ילדים ${fmtILS(wage.couplePlus2)}, הורה יחיד + ילד ${fmtILS(wage.singleParentPlusChild)}, הורה יחיד + 2+ ילדים ${fmtILS(wage.singleParentPlus2)} (נכון ל-${WAGE_AS_OF})`;

/** Mathematical illustration for verified monthly ordinary-debt inputs.
 * Round protection up to an agora to avoid overstating attachability.
 * This presentation convention is not a statutory rounding rule.
 */
export function illustrateMonthlyWage(net: number, base: number) {
  if (!Number.isFinite(net) || !Number.isFinite(base) || net <= 0 || base <= 0 || net > 1_000_000 || base > 1_000_000) return null;
  const netAgorot = Math.round(net * 100);
  const baseAgorot = Math.round(base * 100);
  if (netAgorot < 1 || baseAgorot < 1) return null;
  const exemptAgorot = Math.min(baseAgorot, Math.ceil(netAgorot * 4 / 5));
  return { exempt: exemptAgorot / 100, remainder: (netAgorot - exemptAgorot) / 100 };
}
