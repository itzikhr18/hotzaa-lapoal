import { useState } from 'react';

interface Question {
  id: string;
  text: string;
  options: { value: string; label: string }[];
}

const questions: Question[] = [
  {
    id: 'received',
    text: 'מה קיבלת / קרה לך לאחרונה?',
    options: [
      { value: 'letter', label: '✉️ מכתב מהוצאה לפועל' },
      { value: 'seizure_bank', label: '🏦 עיקלו לי את החשבון' },
      { value: 'seizure_salary', label: '💼 עיקלו לי את המשכורת' },
      { value: 'seizure_property', label: '🏠 מאיימים על נכס / רכב' },
      { value: 'nothing_yet', label: '😟 יש לי חובות ואני מודאג' },
    ],
  },
  {
    id: 'debt_size',
    text: 'בערך כמה אתה חייב בסך הכל?',
    options: [
      { value: 'small', label: 'פחות מ-20,000 ₪' },
      { value: 'medium', label: '20,000 – 100,000 ₪' },
      { value: 'large', label: '100,000 – 200,000 ₪' },
      { value: 'huge', label: 'מעל 200,000 ₪' },
    ],
  },
  {
    id: 'income',
    text: 'יש לך הכנסה קבועה?',
    options: [
      { value: 'yes_salary', label: 'כן — משכורת מעסיק' },
      { value: 'yes_self', label: 'כן — עצמאי / עסק' },
      { value: 'yes_benefits', label: 'כן — קצבאות בלבד' },
      { value: 'no', label: 'לא — כרגע אין לי הכנסה' },
    ],
  },
  {
    id: 'files',
    text: 'כמה תיקים פתוחים נגדך בהוצאה לפועל?',
    options: [
      { value: 'one', label: 'תיק אחד' },
      { value: 'few', label: '2-3 תיקים' },
      { value: 'many', label: '4 תיקים או יותר' },
      { value: 'unknown', label: 'לא יודע' },
    ],
  },
];

interface Result {
  title: string;
  emoji: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
  steps: string[];
  guides: { label: string; href: string }[];
}

function getResult(answers: Record<string, string>): Result {
  const { received, debt_size, income, files } = answers;

  // חדלות פירעון — חוב גדול מאוד
  if (debt_size === 'huge' || (debt_size === 'large' && income === 'no')) {
    return {
      title: 'חדלות פירעון עשויה להיות הפתרון',
      emoji: '⚖️',
      urgency: 'medium',
      description: 'החוב שלך גדול מאוד. הליך חדלות פירעון מאפשר לך לשלם מה שאתה יכול לאורך כ-4 שנים, ובסוף לקבל הפטר — ביטול יתרת החוב.',
      steps: [
        'בדוק אם אתה עומד בסכום המינימלי (58,794 ₪)',
        'התייעץ עם עורך דין לפני שמגישים',
        'הכן מסמכים: תלושי שכר, דפי בנק, רשימת חובות',
      ],
      guides: [
        { label: 'מהי חדלות פירעון?', href: '/insolvency/what-is/' },
        { label: 'כמה עולה ההליך?', href: '/insolvency/costs/' },
        { label: 'מי זכאי?', href: '/insolvency/eligibility/' },
      ],
    };
  }

  // איחוד תיקים — כמה תיקים
  if (files === 'many' || files === 'few') {
    return {
      title: 'איחוד תיקים — הפתרון לכמה חובות',
      emoji: '📋',
      urgency: 'medium',
      description: 'כשיש כמה תיקים — איחוד תיקים מאגד הכל לתשלום חודשי אחד. כל העיקולים מוקפאים ברגע שמאשרים.',
      steps: [
        'הגש בקשה לאיחוד תיקים בלשכת ההוצאה לפועל',
        'הכן: תלושי שכר, רשימת כל התיקים הפתוחים',
        'הרשם ידווח על תשלום חודשי לפי יכולתך',
      ],
      guides: [
        { label: 'מדריך איחוד תיקים', href: '/guides/ichud-tikim/' },
        { label: 'צו תשלומים', href: '/guides/tzav-tashlumim/' },
      ],
    };
  }

  // עיקול דחוף — בנק או משכורת
  if (received === 'seizure_bank') {
    return {
      title: 'עיקול חשבון — פעל עכשיו',
      emoji: '🏦',
      urgency: 'high',
      description: 'עיקול חשבון דחוף לטיפול. יש בדיקות מיידיות שאפשר לעשות — חלק מהכסף עשוי להיות מוגן בחוק.',
      steps: [
        'בקש מהבנק אישור בכתב — מה הסכום המעוקל ומספר התיק',
        'בדוק אם יש בחשבון כסף מקצבאות — הוא מוגן!',
        'הגש בקשה לצו תשלומים לרשם ההוצאה לפועל',
      ],
      guides: [
        { label: 'מדריך עיקול חשבון', href: '/guides/ikul-heshbon/' },
        { label: 'סכומים מוגנים מעיקול', href: '/rights/skhomim-mugganim/' },
        { label: 'בקש צו תשלומים', href: '/guides/tzav-tashlumim/' },
      ],
    };
  }

  if (received === 'seizure_salary') {
    return {
      title: 'עיקול משכורת — יש הגנות בחוק',
      emoji: '💼',
      urgency: 'high',
      description: 'מקסימום שליש מהמשכורת נטו ניתן לעיקול. שכר מינימום מוגן לחלוטין. אפשר לבקש הפחתה.',
      steps: [
        'בדוק שהסכום המנוכה לא עולה על שליש מהמשכורת נטו',
        'אם השכר שלך קרוב למינימום — ייתכן שהעיקול לא חוקי',
        'הגש בקשה לצו תשלומים לעצירת העיקול',
      ],
      guides: [
        { label: 'מדריך עיקול משכורת', href: '/guides/ikul-maskoret/' },
        { label: 'סכומים מוגנים', href: '/rights/skhomim-mugganim/' },
      ],
    };
  }

  // מכתב — התחלה
  if (received === 'letter') {
    return {
      title: 'קיבלת מכתב — יש לך 20 יום',
      emoji: '✉️',
      urgency: 'high',
      description: 'מכתב מהוצאה לפועל נותן לך 20 יום להגיב. אל תתעלם — זה הזמן לפעול ולמנוע עיקולים.',
      steps: [
        'קרא את המכתב ומצא: מספר תיק, שם הנושה, סכום',
        'בדוק אם החוב אמיתי ואם הסכום נכון',
        'הגש בקשה לצו תשלומים בתוך 20 יום',
      ],
      guides: [
        { label: 'מה עושים עם מכתב מהוצל"פ', href: '/guides/michtav-hotzaa/' },
        { label: 'איך מגישים צו תשלומים', href: '/guides/tzav-tashlumim/' },
        { label: '10 הזכויות שלך', href: '/rights/10-zchuyot/' },
      ],
    };
  }

  // ברירת מחדל — צו תשלומים
  return {
    title: 'צו תשלומים — הצעד הראשון',
    emoji: '📝',
    urgency: 'low',
    description: 'בהתאם למצב שלך, הגשת בקשה לצו תשלומים היא הדרך המסודרת ביותר להתחיל להסדיר את החוב לפי יכולתך.',
    steps: [
      'אסוף תלושי שכר ודפי בנק של 3 חודשים',
      'מלא טופס בקשה לצו תשלומים (טופס 6)',
      'הגש בלשכת ההוצאה לפועל הקרובה',
    ],
    guides: [
      { label: 'מדריך צו תשלומים', href: '/guides/tzav-tashlumim/' },
      { label: 'זכויות חייבים', href: '/rights/' },
    ],
  };
}

export default function EligibilityChecker() {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);

  function answer(value: string) {
    const q = questions[currentQ];
    const newAnswers = { ...answers, [q.id]: value };
    setAnswers(newAnswers);

    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setResult(getResult(newAnswers));
    }
  }

  function reset() {
    setCurrentQ(0);
    setAnswers({});
    setResult(null);
  }

  const urgencyColors = {
    high: 'bg-red-50 border-red-200',
    medium: 'bg-orange-50 border-orange-200',
    low: 'bg-blue-50 border-blue-200',
  };

  const urgencyLabels = {
    high: '🔴 דחוף — פעל בהקדם',
    medium: '🟡 חשוב — כדאי לטפל',
    low: '🟢 לא חירום — יש זמן לתכנן',
  };

  if (result) {
    return (
      <div dir="rtl" className="font-sans space-y-5">
        <div className={`border-2 rounded-2xl p-6 ${urgencyColors[result.urgency]}`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">{result.emoji}</span>
            <div>
              <p className="text-xs font-bold text-gray-500 mb-0.5">{urgencyLabels[result.urgency]}</p>
              <h2 className="text-xl font-bold text-gray-800">{result.title}</h2>
            </div>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">{result.description}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-gray-800 mb-3">הצעדים שלך עכשיו:</h3>
          <ol className="space-y-2">
            {result.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-gray-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-gray-800 mb-3">מדריכים שיעזרו לך:</h3>
          <div className="flex flex-wrap gap-2">
            {result.guides.map(g => (
              <a
                key={g.href}
                href={g.href}
                className="text-sm bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors"
              >
                {g.label} ←
              </a>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          ⚠️ תוצאות אלו הן הכוונה כללית בלבד ואינן ייעוץ משפטי. לייעוץ אישי — פנה לעורך דין.
        </p>

        <button
          onClick={reset}
          className="w-full text-sm text-gray-500 border border-gray-200 rounded-xl py-2.5 hover:bg-gray-50 transition-colors"
        >
          ← התחל מחדש
        </button>
      </div>
    );
  }

  const q = questions[currentQ];
  const progress = Math.round((currentQ / questions.length) * 100);

  return (
    <div dir="rtl" className="font-sans">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>שאלה {currentQ + 1} מתוך {questions.length}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="bg-blue-700 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <h2 className="text-lg font-bold text-gray-800 mb-5">{q.text}</h2>

      <div className="space-y-2.5">
        {q.options.map(opt => (
          <button
            key={opt.value}
            onClick={() => answer(opt.value)}
            className="w-full text-right bg-white border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-700 transition-all"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
