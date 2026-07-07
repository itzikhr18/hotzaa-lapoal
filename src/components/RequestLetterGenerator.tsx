import { useMemo, useState } from 'react';

// מחולל נוסח בקשה לרשם ההוצאה לפועל — מרכיב מכתב פורמלי מנתוני המשתמש.
// הכל רץ בדפדפן בלבד: שום פרט אישי לא נשלח לשרת.

interface RequestType {
  id: string;
  label: string;
  subject: string;
  request: string;
  grounds: string[];
  attachments: string[];
}

const REQUEST_TYPES: RequestType[] = [
  {
    id: 'bitul-ikul-heshbon',
    label: 'ביטול עיקול חשבון בנק',
    subject: 'בקשה לביטול עיקול חשבון בנק',
    request: 'להורות על ביטול העיקול שהוטל על חשבון הבנק שלי, ולחלופין על שחרור הכספים המוגנים שבחשבון.',
    grounds: [
      'בחשבון מופקדים כספים מוגנים מעיקול על פי דין (קצבאות ביטוח לאומי / שכר עבודה בגובה שכר ההגנה).',
      'העיקול פוגע פגיעה קשה ביכולתי לממן צרכי מחיה בסיסיים — מזון, תרופות, שכר דירה וחשבונות שוטפים.',
      'החוב בתיק שולם או הוסדר, ולא היה מקום להטלת העיקול.',
      'העיקול הוטל על סכום העולה על יתרת החוב בתיק.',
    ],
    attachments: ['תדפיס עו"ש 3 חודשים אחרונים', 'אישורים על קצבאות (אם רלוונטי)', 'תלושי שכר אחרונים'],
  },
  {
    id: 'bitul-ikul-maskoret',
    label: 'ביטול או הפחתת עיקול משכורת',
    subject: 'בקשה לביטול / הפחתת עיקול משכורת',
    request: 'להורות על ביטול העיקול שהוטל על משכורתי, ולחלופין על הפחתת שיעור הניכוי.',
    grounds: [
      'משכורתי נטו אינה עולה על שכר ההגנה הקבוע בדין להרכב משפחתי, ולפיכך היא מוגנת מעיקול.',
      'הניכוי מהמשכורת עולה על התקרה הקבועה בחוק הגנת השכר (20% מהנטו לעובד חודשי).',
      'הניכוי הנוכחי אינו מותיר בידי סכום המספיק להוצאות קיום בסיסיות שלי ושל בני משפחתי.',
    ],
    attachments: ['3 תלושי שכר אחרונים', 'פירוט הוצאות חודשיות (שכירות, חשבונות, תרופות)', 'אישורים על בני משפחה תלויים'],
  },
  {
    id: 'tzav-tashlumim',
    label: 'בקשה לצו תשלומים',
    subject: 'בקשה למתן צו תשלומים',
    request: 'לקבוע לי צו תשלומים חודשי התואם את יכולתי הכלכלית, ולהורות על עיכוב הליכי הגבייה כנגדי כל עוד אני עומד/ת בצו.',
    grounds: [
      'אין ביכולתי לפרוע את מלוא החוב בתשלום אחד, אך ברצוני להסדירו בתשלומים חודשיים קבועים.',
      'הכנסתי החודשית ומחויבויותיי המשפחתיות אינן מאפשרות תשלום העולה על הסכום המוצע על ידי.',
      'אני מעוניין/ת לשלם את חובי בדרך מסודרת ולהימנע מהליכי גבייה נוספים.',
    ],
    attachments: ['תלושי שכר / אישורי הכנסה 3 חודשים אחרונים', 'תדפיס עו"ש', 'פירוט הוצאות חודשיות', 'טופס כלכלי מלא (טופס 214) ככל שנדרש'],
  },
  {
    id: 'hashavat-sechum',
    label: 'השבת סכום שנוכה ביתר',
    subject: 'בקשה להשבת סכום שנגבה ביתר',
    request: 'להורות על השבת הסכום שנגבה ממני ביתר, ועל תיקון צו העיקול כך שיעמוד בהוראות הדין.',
    grounds: [
      'הסכום שנוכה ממשכורתי / מחשבוני עולה על התקרה המותרת על פי דין.',
      'נוכו ממני כספים מוגנים מעיקול (קצבאות / שכר בגובה שכר ההגנה).',
      'הניכוי בוצע לאחר שהחוב בתיק נפרע או הוסדר.',
    ],
    attachments: ['תלושי שכר / תדפיסי בנק המעידים על הניכוי', 'אסמכתאות על תשלומים שבוצעו בתיק'],
  },
];

export default function RequestLetterGenerator() {
  const [typeId, setTypeId] = useState(REQUEST_TYPES[0].id);
  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [lishka, setLishka] = useState('');
  const [selectedGrounds, setSelectedGrounds] = useState<number[]>([0]);
  const [extra, setExtra] = useState('');
  const [copied, setCopied] = useState(false);

  const reqType = REQUEST_TYPES.find(t => t.id === typeId)!;

  const toggleGround = (i: number) => {
    setSelectedGrounds(prev => (prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i].sort()));
  };

  const changeType = (id: string) => {
    setTypeId(id);
    setSelectedGrounds([0]);
  };

  const letter = useMemo(() => {
    const grounds = selectedGrounds.map(i => reqType.grounds[i]).filter(Boolean);
    const groundLines = [...grounds, ...(extra.trim() ? [extra.trim()] : [])]
      .map((g, i) => `${i + 1}. ${g}`)
      .join('\n');
    const attachments = reqType.attachments.map(a => `- ${a}`).join('\n');

    return `לכבוד
כבוד רשם ההוצאה לפועל
לשכת ההוצאה לפועל ${lishka.trim() || '____________'}

הנדון: ${reqType.subject} — תיק הוצאה לפועל מספר ${caseNumber.trim() || '____________'}

אני החתום/ה מטה, ${fullName.trim() || '____________'}, נושא/ת ת.ז. ${idNumber.trim() || '____________'}, החייב/ת בתיק שבנדון, מתכבד/ת לפנות לכבוד הרשם בבקשה כדלקמן:

נימוקי הבקשה:
${groundLines || '1. ____________'}

אשר על כן, מתבקש כבוד הרשם ${reqType.request}

מסמכים מצורפים:
${attachments}

אבקש כי החלטת כבוד הרשם תישלח אליי בהקדם האפשרי.

בכבוד רב,
${fullName.trim() || '____________'}
ת.ז. ${idNumber.trim() || '____________'}${phone.trim() ? `\nטלפון: ${phone.trim()}` : ''}
תאריך: ${new Date().toLocaleDateString('he-IL')}`;
  }, [reqType, selectedGrounds, extra, fullName, idNumber, phone, caseNumber, lishka]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const download = () => {
    const blob = new Blob(['﻿' + letter], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bakasha-${reqType.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none';

  return (
    <div dir="rtl" className="font-sans">

      <div className="mb-5">
        <label htmlFor="rl-type" className="block text-sm font-semibold text-gray-700 mb-1">סוג הבקשה</label>
        <select id="rl-type" value={typeId} onChange={e => changeType(e.target.value)} className={`${inputClass} bg-white`}>
          {REQUEST_TYPES.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div>
          <label htmlFor="rl-name" className="block text-sm font-semibold text-gray-700 mb-1">שם מלא</label>
          <input id="rl-name" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="ישראל ישראלי" className={inputClass} />
        </div>
        <div>
          <label htmlFor="rl-id" className="block text-sm font-semibold text-gray-700 mb-1">מספר תעודת זהות</label>
          <input id="rl-id" type="text" inputMode="numeric" value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="123456789" className={inputClass} />
        </div>
        <div>
          <label htmlFor="rl-case" className="block text-sm font-semibold text-gray-700 mb-1">מספר תיק הוצאה לפועל</label>
          <input id="rl-case" type="text" value={caseNumber} onChange={e => setCaseNumber(e.target.value)} placeholder="למשל: 501234-05-25" className={inputClass} />
        </div>
        <div>
          <label htmlFor="rl-lishka" className="block text-sm font-semibold text-gray-700 mb-1">לשכת ההוצאה לפועל</label>
          <input id="rl-lishka" type="text" value={lishka} onChange={e => setLishka(e.target.value)} placeholder="למשל: תל אביב" className={inputClass} />
        </div>
        <div>
          <label htmlFor="rl-phone" className="block text-sm font-semibold text-gray-700 mb-1">טלפון (לא חובה)</label>
          <input id="rl-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="050-0000000" className={inputClass} />
        </div>
      </div>

      <fieldset className="mb-5">
        <legend className="block text-sm font-semibold text-gray-700 mb-2">נימוקים (בחר את המתאימים למצבך)</legend>
        <div className="space-y-2">
          {reqType.grounds.map((g, i) => (
            <label key={i} className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedGrounds.includes(i)}
                onChange={() => toggleGround(i)}
                className="w-4 h-4 accent-blue-600 mt-0.5 shrink-0"
              />
              <span>{g}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mb-6">
        <label htmlFor="rl-extra" className="block text-sm font-semibold text-gray-700 mb-1">פירוט נוסף במילים שלך (לא חובה)</label>
        <textarea
          id="rl-extra"
          value={extra}
          onChange={e => setExtra(e.target.value)}
          rows={3}
          maxLength={600}
          placeholder="למשל: אני הורה יחיד לשני ילדים, והעיקול לא מותיר לי כסף לשכר דירה..."
          className={inputClass}
        />
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
        <p className="text-sm font-bold text-gray-700 mb-2">תצוגה מקדימה של הבקשה:</p>
        <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-sans bg-white border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">{letter}</pre>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={copy} className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-6 py-2.5 rounded-lg transition-colors text-sm">
          {copied ? '✓ הועתק!' : 'העתק את הנוסח'}
        </button>
        <button onClick={download} className="bg-white hover:bg-gray-50 text-brand-dark font-bold px-6 py-2.5 rounded-lg border-2 border-brand-dark transition-colors text-sm">
          הורד כקובץ טקסט
        </button>
      </div>

      <p className="text-xs text-gray-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mt-4">
        🔒 <strong>פרטיות:</strong> הנוסח נוצר בדפדפן שלך בלבד — שום פרט אישי לא נשלח לשרת או נשמר.
        ⚠️ הנוסח הוא בסיס לעריכה אישית ואינו תחליף לייעוץ משפטי.
      </p>
    </div>
  );
}
