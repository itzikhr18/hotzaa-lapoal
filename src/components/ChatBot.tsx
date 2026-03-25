import { useState, useRef, useEffect } from 'react';

const SYSTEM_PROMPT = `אתה עוזר מידע מקצועי בנושא הוצאה לפועל וחדלות פירעון בישראל.

כללים מחייבים:
- אתה עונה רק בעברית
- אתה לא עורך דין ולא נותן ייעוץ משפטי אישי
- אתה עונה בשפה פשוטה, חברית ואמפתית — כמו חבר חכם שמסביר
- תשובות קצרות לשאלות פשוטות (2-3 משפטים), מפורטות לשאלות מורכבות
- בסוף כל תשובה — הוסף disclaimer קצר: "מידע זה הוא כללי בלבד ואינו ייעוץ משפטי."
- אם השאלה מחוץ לתחום הוצאה לפועל/חדלות פירעון — אמור בנימוס שאתה מתמחה רק בתחום זה

נושאים שאתה מכסה:
- הוצאה לפועל: עיקולים, צו תשלומים, איחוד תיקים, זכויות חייבים
- חדלות פירעון: הליך, זכאות, עלויות, הפטר, שלבים
- תיקון 9 לחוק פסיקת ריבית (מינואר 2025)
- נכסים וסכומים מוגנים מעיקול
- הגבלות על חייב (עיכוב יציאה, רישיון נהיגה)

כשאתה לא יודע לענות — אמור בדיוק כך:
"אין לי מידע מספיק על שאלה זו. מומלץ להתייעץ עם עורך דין המתמחה בהוצאה לפועל, או לפנות ללשכה לסיוע משפטי."
ואז הצע מדריך רלוונטי מהאתר אם קיים.`;

const SUGGESTED_QUESTIONS = [
  'עיקלו לי את חשבון הבנק — מה עושים?',
  'כמה ניתן לעקל ממשכורת?',
  'מה זה צו תשלומים ואיך מגישים?',
  'האם קצבת ביטוח לאומי ניתנת לעיקול?',
  'מה זה חדלות פירעון ומי זכאי?',
  'כמה עולה הליך חדלות פירעון?',
];

interface Message {
  role: 'user' | 'assistant';
  text: string;
  loading?: boolean;
}

export default function ChatBot({ apiKey }: { apiKey: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'שלום! אני כאן לעזור עם שאלות על הוצאה לפועל וחדלות פירעון. מה השאלה שלך?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', text };
    setMessages(prev => [...prev, userMsg, { role: 'assistant', text: '', loading: true }]);
    setInput('');
    setLoading(true);

    try {
      const history = messages
        .filter(m => !m.loading)
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }],
        }));

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [
              ...history,
              { role: 'user', parts: [{ text }] },
            ],
            generationConfig: { maxOutputTokens: 800, temperature: 0.3 },
          }),
        }
      );

      const data = await res.json();
      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        'מצטער, לא הצלחתי לעבד את השאלה. נסה שוב.';

      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', text: reply },
      ]);
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          text: 'אירעה שגיאה טכנית. בדוק שמפתח ה-API תקין ונסה שוב.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="flex flex-col gap-4 font-sans">

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        🤖 צ'אטבוט AI — עלול לטעות. אינו מחליף ייעוץ משפטי אישי.
      </div>

      {/* Messages */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 h-96 overflow-y-auto flex flex-col gap-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-700 text-white rounded-tr-sm'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
              }`}
            >
              {msg.loading ? (
                <span className="flex gap-1 items-center">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              ) : msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions — only at start */}
      {messages.length <= 2 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors text-right"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
          placeholder="שאל שאלה על הוצאה לפועל..."
          disabled={loading}
          dir="rtl"
          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white font-bold px-5 py-3 rounded-xl text-sm transition-colors"
        >
          שלח
        </button>
      </div>

      {/* Links when bot doesn't know */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-800 mb-2">לא קיבלת תשובה מספקת? נסה:</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'מדריכים', href: '/guides/' },
            { label: 'זכויות חייבים', href: '/rights/' },
            { label: 'שאלות נפוצות', href: '/faq/' },
            { label: 'לשכה לסיוע משפטי', href: 'https://www.gov.il/he/departments/ministry_of_justice_legal_aid/govil-landing-page', external: true },
          ].map(l => (
            <a
              key={l.label}
              href={l.href}
              target={l.external ? '_blank' : undefined}
              rel={l.external ? 'noopener noreferrer' : undefined}
              className="text-xs bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
            >
              {l.label} ←
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
