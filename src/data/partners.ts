export const PARTNER_EMAIL = 'itzikhr18@gmail.com';
export const PARTNER_ALTERNATE_EMAIL = 'partners@hotzaa-lapoal.info';

const contactSubject = 'התעניינות ברכישת כלי הכנה לפגישת ייעוץ — בדוא״ל בלבד';
const contactBody = [
  'שלום איציק, אני מעוניין/ת בפרטים לרכישת כלי הכנה לפגישת ייעוץ תחת מותג המשרד.',
  'אבקש לקבל את התכולה, המחיר, תנאי הרישוי ואופן האספקה בדוא״ל, ללא שיחת מכירה.',
  '',
  'כתובת אתר המשרד:',
  'תחום העיסוק של המשרד:',
  'איזו הכנה לפגישה נרצה להציע באתר:',
  '',
  'הפנייה עוסקת ברישוי כלי דיגיטלי למשרד. אין לצרף פרטי לקוחות, מסמכים משפטיים או מספרי תיקים.',
].join('\n');

export const PARTNER_CONTACT_HREF = `mailto:${PARTNER_EMAIL}?subject=${encodeURIComponent(contactSubject)}&body=${encodeURIComponent(contactBody)}`;
