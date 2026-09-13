export const PARTNER_EMAIL = 'partners@hotzaa-lapoal.info';

const contactSubject = 'בדיקת התאמה לכלי הכנה לפגישת ייעוץ באתר המשרד';
const contactBody = [
  'שלום, אשמח לבדוק התאמה של כלי הכנה לפגישת ייעוץ תחת מותג המשרד.',
  '',
  'כתובת אתר המשרד:',
  'תחום העיסוק של המשרד:',
  'איזו הכנה לפגישה נרצה להציע באתר:',
  '',
  'הפנייה עוסקת ברישוי כלי דיגיטלי למשרד. אין לצרף פרטי לקוחות, מסמכים משפטיים או מספרי תיקים.',
].join('\n');

export const PARTNER_CONTACT_HREF = `mailto:${PARTNER_EMAIL}?subject=${encodeURIComponent(contactSubject)}&body=${encodeURIComponent(contactBody)}`;
