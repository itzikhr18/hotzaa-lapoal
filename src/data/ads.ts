/**
 * הגדרות AdSense — במקום אחד.
 *
 * כדי שמודעות יוצגו בפועל צריך 3 דברים:
 *   1. שחשבון/אתר ה-AdSense יהיה **מאושר** (אתר חדש בבדיקה לא יציג כלום).
 *   2. ליצור "יחידות מודעה" ב-AdSense:
 *        Ads → By ad unit → Display ads (ו-In-feed/In-article ליחידה בתוך המאמר)
 *   3. להעתיק את ה-data-ad-slot (מספר) של כל יחידה לכאן למטה.
 *
 * כל עוד ה-slot ריק ('') — היחידה פשוט לא מוצגת (לא יופיע ריבוע ריק).
 * אפשר לכבות את כל המודעות בבת אחת עם ADS_ENABLED = false.
 */

export const ADSENSE_CLIENT = 'ca-pub-1249745886248914';

export const ADS_ENABLED = true;

/** מזהי יחידות מודעה מתוך לוח הבקרה של AdSense. ריק = לא מוצג. */
export const AD_SLOTS = {
  inArticle: '',   // יחידה בתוך המאמר (in-article)
  endArticle: '',  // יחידה בסוף המאמר
  sidebar: '',     // יחידה בסרגל הצד (דסקטופ בלבד)
} as const;
