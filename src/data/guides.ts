/**
 * רשימת כל המדריכים באתר — מקור אמת יחיד.
 *
 * משמש את רשת "מדריכים קשורים" בתחתית כל מדריך (GuideLayout),
 * וכל מקום נוסף שצריך את הרשימה המלאה. מדריך חדש? מוסיפים שורה כאן
 * והוא מופיע אוטומטית בכל העמודים.
 */
export interface GuideLink {
  title: string;
  href: string;
  icon: string;
}

export const allGuides: GuideLink[] = [
  { title: 'עיקול חשבון בנק', href: '/guides/ikul-heshbon/', icon: '🏦' },
  { title: 'ביטול עיקול', href: '/guides/bitul-ikul/', icon: '✅' },
  { title: 'טפסים ונוסחים', href: '/forms/', icon: '📋' },
  { title: 'עיקול משכורת', href: '/guides/ikul-maskoret/', icon: '💼' },
  { title: 'צו תשלומים', href: '/guides/tzav-tashlumim/', icon: '📋' },
  { title: 'פשיטת רגל', href: '/guides/pshitat-regel/', icon: '⚖️' },
  { title: 'מזונות בהוצאה לפועל', href: '/guides/mazamot/', icon: '👨‍👧' },
  { title: 'עיכוב יציאה מהארץ', href: '/guides/ikul-yetzia/', icon: '✈️' },
  { title: 'איחוד תיקים', href: '/guides/ichud-tikim/', icon: '📂' },
  { title: 'עיקול רכב', href: '/guides/ikul-rechev/', icon: '🚗' },
  { title: 'כינוס נכסים', href: '/guides/kinnus-nechasim/', icon: '🏛️' },
  { title: 'ערב בהוצאה לפועל', href: '/guides/arev/', icon: '🤝' },
  { title: 'התיישנות חוב', href: '/guides/hitiyashnoot-chov/', icon: '⏰' },
  { title: 'סגירת תיק הוצאה לפועל', href: '/guides/sgor-tik/', icon: '🔒' },
  { title: 'עיקול פנסיה וקצבאות', href: '/guides/ikul-pensiya/', icon: '🏛️' },
  { title: 'עיקול דירה ומקרקעין', href: '/guides/ikul-dira/', icon: '🏠' },
  { title: 'הסדר חוב עם נושים', href: '/guides/hisdurim-chov/', icon: '🤝' },
  { title: 'בדיקת תיק הוצאה לפועל', href: '/guides/bdika-tik/', icon: '🔍' },
  { title: 'ריבית בהוצאה לפועל', href: '/guides/ribit-hotzaa/', icon: '📈' },
  { title: 'ביטול הגבלות', href: '/guides/bitul-hagbalot/', icon: '🔓' },
  { title: 'עיקול זמני', href: '/guides/ikul-zman/', icon: '⏱️' },
  { title: 'ערעור על הוצאה לפועל', href: '/guides/irur-hotzaa/', icon: '⚖️' },
  { title: 'לשכת הוצאה לפועל', href: '/guides/lishkat-hotzaa/', icon: '🏛️' },
  { title: 'פסק דין בהוצאה לפועל', href: '/guides/psak-din/', icon: '📄' },
  { title: 'עורך דין הוצאה לפועל', href: '/guides/orech-din/', icon: '👨‍⚖️' },
  { title: 'מכתב מהוצאה לפועל', href: '/guides/michtav-hotzaa/', icon: '✉️' },
  { title: 'תיקון 9 — תיקוני 2025', href: '/guides/tikunim-2025/', icon: '📜' },
  { title: 'חקירת יכולת', href: '/guides/hakirat-yecholet/', icon: '🔎' },
  { title: 'התנגדות לתיק הוצל"פ', href: '/guides/hitnagdut-letik/', icon: '✋' },
  { title: 'חוב ארנונה', href: '/guides/chov-arnona/', icon: '🏘️' },
  { title: 'חייב מוגבל באמצעים', href: '/guides/hayav-mugbal/', icon: '⛔' },
  { title: 'הוצאה לפועל לעצמאים', href: '/guides/atzmait/', icon: '👨‍💼' },
  { title: 'שלילת רישיון נהיגה', href: '/guides/rishayon-nehiga/', icon: '🚫' },
];
