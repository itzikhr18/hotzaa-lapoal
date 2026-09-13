import { useState } from 'react';

interface Question {
  id: string;
  text: string;
  options: { value: string; label: string }[];
}

const questions: Question[] = [
  { id: 'received', text: 'באיזה נושא תרצה לקרוא?', options: [
    { value: 'letter', label: '✉️ אזהרה או מכתב מהוצאה לפועל' },
    { value: 'seizure_bank', label: '🏦 עיקול חשבון בנק' },
    { value: 'seizure_salary', label: '💼 עיקול משכורת' },
    { value: 'seizure_property', label: '🏠 עיקול נכס או רכב' },
    { value: 'general', label: '📖 מידע כללי על חובות' },
  ] },
  { id: 'case_info', text: 'האם כבר ברור לך מה כתוב בתיק?', options: [
    { value: 'known', label: 'כן — מצאתי את פרטי התיק וההחלטות' },
    { value: 'unknown', label: 'לא — אני צריך מידע על בדיקת תיק' },
  ] },
  { id: 'topic', text: 'איזה מידע נוסף יעזור לך?', options: [
    { value: 'rights', label: 'זכויות והגנות אפשריות' },
    { value: 'forms', label: 'טפסים ודרכי הגשה רשמיות' },
    { value: 'routes', label: 'הבדלים בין מסלולים להסדרת חובות' },
  ] },
  { id: 'files', text: 'האם תרצה גם הסבר על ריבוי תיקים?', options: [
    { value: 'many', label: 'כן — מידע על כמה תיקים ואיחוד תיקים' },
    { value: 'one', label: 'לא כרגע' },
    { value: 'unknown', label: 'קודם ארצה לברר אילו תיקים קיימים' },
  ] },
];

interface Resource { label: string; href: string }
interface Result { title: string; description: string; guides: Resource[] }

function getResult(answers: Record<string, string>): Result {
  const topics: Record<string, Result> = {
    letter: { title: 'קריאת אזהרה ובירור אפשרויות תגובה', description: 'סוג התיק והמסמך קובעים את המועד והמסלול. אין מועד אחיד של 30 יום לכל אזהרה; יש לבדוק את ההודעה וההנחיות הרשמיות בלי להמתין להשלמת הקריאה באתר.', guides: [
      { label: 'קבלת מכתב מהוצאה לפועל — מה לבדוק', href: '/guides/michtav-hotzaa/' },
      { label: 'התנגדות לביצוע שטר או תביעה — תנאים ומועדים', href: '/guides/hitnagdut-letik/' },
    ] },
    seizure_bank: { title: 'מידע על עיקול חשבון בנק', description: 'יש לבדוק את הצו ואת מקור הכספים. הגנות על כספים תלויות בסוגם, בזמן ובחריגים בחוק. בחירה בשאלון אינה קובעת שהכסף מוגן או שהעיקול מבוטל.', guides: [
      { label: 'עיקול חשבון בנק — בדיקות ומסמכים', href: '/guides/ikul-heshbon/' },
      { label: 'בקשה רשמית לביטול עיקול חשבון בנק', href: 'https://www.gov.il/he/service/foreclosure_cancellation_request' },
    ] },
    seizure_salary: { title: 'מידע על עיקול משכורת', description: 'בדיקת ההגנה על השכר תלויה בנתונים ובדין החל, לרבות חריגים. השאלון אינו מחשב סכום מוגן ואינו קובע שהניכוי אינו חוקי.', guides: [
      { label: 'עיקול משכורת — ההגנות והבדיקות', href: '/guides/ikul-maskoret/' },
      { label: 'טופס 214 הרשמי לבקשות לגבי הליכי עיקול', href: 'https://www.gov.il/BlobFolder/service/processes_cancellation/he/form214.pdf' },
    ] },
    seizure_property: { title: 'מידע על הליכים בנכס או ברכב', description: 'יש להבחין בין רישום עיקול לבין תפיסה או מימוש, ולבדוק את הצו ואת המועד. אין הגנה אוטומטית לכל דירה יחידה או לרכב המשמש לעבודה.', guides: [
      { label: 'עיקול דירת מגורים — מה לבדוק', href: '/guides/ikul-dira/' },
      { label: 'עיקול רכב — רישום ומימוש', href: '/guides/ikul-rechev/' },
      { label: 'בקשה רשמית לעיכוב הליכים', href: 'https://www.gov.il/he/service/delay_processes' },
    ] },
    general: { title: 'מידע ראשוני על חובות והוצאה לפועל', description: 'נקודת הפתיחה היא בירור חובות והחלטות. אין די במספר תיקים או בגובה חוב כדי לקבוע מסלול מתאים.', guides: [
      { label: 'מדריכי הוצאה לפועל לפי נושא', href: '/guides/' },
    ] },
  };
  const base = topics[answers.received] ?? topics.general;
  const guides = [...base.guides];
  if (answers.case_info === 'unknown' || answers.files === 'unknown') {
    guides.unshift({ label: 'איך בודקים תיק והחלטות באזור האישי', href: '/guides/bdika-tik/' });
  }
  if (answers.topic === 'forms') guides.push({ label: 'טפסים 214, 218, 233 ומסמכים נלווים', href: '/forms/' });
  if (answers.topic === 'rights') guides.push({ label: 'זכויות חייבים והחריגים להגנות', href: '/rights/' });
  if (answers.topic === 'routes') guides.push(
    { label: 'צו תשלומים — בקשה והחלטה', href: '/guides/tzav-tashlumim/' },
    { label: 'חדלות פירעון — תנאים והשלכות', href: '/insolvency/' },
    { label: 'הסדר עם נושים — מה לבדוק', href: '/guides/hisdurim-chov/' },
  );
  if (answers.files === 'many') guides.push({ label: 'איחוד תיקים — תנאים ותיקים שאינם נכללים', href: '/guides/ichud-tikim/' });
  return { ...base, guides };
}

export default function EligibilityChecker() {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);

  function answer(value: string) {
    const newAnswers = { ...answers, [questions[currentQ].id]: value };
    setAnswers(newAnswers);
    if (currentQ < questions.length - 1) setCurrentQ(currentQ + 1);
    else setResult(getResult(newAnswers));
  }
  function reset() { setCurrentQ(0); setAnswers({}); setResult(null); }

  if (result) {
    return (
      <div dir="rtl" className="font-sans space-y-5" aria-live="polite">
        <div className="border-2 border-blue-200 bg-blue-50 rounded-2xl p-6">
          <p className="text-xs font-bold text-blue-800 mb-2">מפת קריאה — לא החלטת זכאות</p>
          <h2 className="text-xl font-bold text-gray-800 mb-3">{result.title}</h2>
          <p className="text-gray-700 text-sm leading-relaxed">{result.description}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-gray-800 mb-3">מדריכים ומקורות לפי הנושאים שבחרת</h3>
          <ul className="space-y-3">
            {result.guides.map(g => (
              <li key={g.href}><a href={g.href} className="text-sm text-blue-800 underline">{g.label}</a></li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-4">
          הגשת בקשה או שימוש בכלי אינם מעכבים הליכים. בדוק כל מועד והחלטה בתיק.
          אין לשנות תשלום או להסיק זכאות להפטר, ביטול עיקול או איחוד תיקים מתוצאה זו.
        </p>
        <p className="text-xs text-gray-700">הבחירות אינן נשלחות לשרת ואינן נשמרות על ידי הכלי. פתיחת קישור ממשלתי מעבירה לאתר חיצוני ולכללים שלו.</p>
        <button type="button" onClick={reset} className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl py-3 hover:bg-gray-50">התחל מחדש</button>
      </div>
    );
  }

  const q = questions[currentQ];
  const progress = Math.round((currentQ / questions.length) * 100);
  return (
    <div dir="rtl" className="font-sans">
      <div className="mb-6">
        <p className="text-xs text-gray-600 mb-2">שאלה {currentQ + 1} מתוך {questions.length}</p>
        <div className="w-full bg-gray-100 rounded-full h-1.5" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`שאלה ${currentQ + 1} מתוך ${questions.length}`}>
          <div className="bg-blue-700 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <h2 className="text-lg font-bold text-gray-800 mb-5">{q.text}</h2>
      <div className="space-y-2.5">{q.options.map(opt => (
        <button type="button" key={opt.value} onClick={() => answer(opt.value)} className="w-full text-right bg-white border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-700 transition-all">{opt.label}</button>
      ))}</div>
      {currentQ > 0 && <button type="button" onClick={() => setCurrentQ(currentQ - 1)} className="mt-4 text-sm text-gray-700 underline">חזרה לשאלה הקודמת</button>}
    </div>
  );
}
