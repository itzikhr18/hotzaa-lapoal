/**
 * סכומי "שכר הגנה" — הסכום הנטו המוגן מעיקול, לפי הרכב המשפחה.
 *
 * ⚠️ מקור אמת יחיד: עדכון שנתי של הסכומים מתבצע כאן בלבד —
 * כל העמודים (טבלאות, רשימות, תשובות FAQ וסכמות) נבנים מהקובץ הזה.
 * מקור לבדיקה: כל-זכות / רשות האכיפה והגבייה.
 */
export const WAGE_AS_OF = '2026';

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
