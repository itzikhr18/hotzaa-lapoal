import { useState, useRef, useEffect } from 'react';

// המפתח של Gemini וה-SYSTEM_PROMPT נמצאים בצד השרת בלבד (functions/api/chat.js).
// הרכיב הזה מדבר רק עם /api/chat ולעולם לא עם Gemini ישירות — כך המפתח לא נחשף בדפדפן.

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
  isError?: boolean;
}

export default function ChatBot() {
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
      // שולחים את כל היסטוריית השיחה (כולל ההודעה החדשה) ל-proxy בצד השרת.
      // המפתח של Gemini נשמר בשרת (functions/api/chat.js) ולא נחשף בדפדפן.
      const convo = [...messages.filter(m => !m.loading), { role: 'user' as const, text }];

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: convo.map(m => ({ role: m.role, text: m.text })),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errText = data?.error || 'אירעה שגיאה. נסה שוב בעוד רגע.';
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', text: errText, isError: true },
        ]);
        setInput(text); // מחזירים את השאלה לשדה כדי שלא תיאבד
        return;
      }

      const reply = data?.reply || 'מצטער, לא הצלחתי לעבד את השאלה. נסה שוב.';
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', text: reply },
      ]);
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          text: 'אירעה שגיאה טכנית. השאלה שלך נשמרה בשדה — נסה לשלוח שוב.',
          isError: true,
        },
      ]);
      setInput(text); // מחזירים את השאלה לשדה כדי שלא תיאבד
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="flex flex-col gap-4 font-sans">

      {/* Disclaimer */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-gray-700">
        🤖 צ'אטבוט AI — עלול לטעות. אינו מחליף ייעוץ משפטי אישי.
      </div>

      {/* Messages */}
      <div
        className="bg-gray-50 border border-gray-200 rounded-xl p-4 h-96 overflow-y-auto flex flex-col gap-3"
        role="log"
        aria-live="polite"
        aria-label="שיחה עם הצ'אטבוט"
      >
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-700 text-white rounded-tr-sm'
                  : msg.isError
                    ? 'bg-red-50 border border-red-200 text-red-800 rounded-tl-sm'
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

      {/* Clear button */}
      {messages.length > 1 && (
        <button
          onClick={() => { setMessages([{ role: 'assistant', text: 'שלום! אני כאן לעזור עם שאלות על הוצאה לפועל וחדלות פירעון. מה השאלה שלך?' }]); setInput(''); }}
          className="text-xs text-gray-500 hover:text-gray-700 text-right transition-colors"
        >
          נקה שיחה ←
        </button>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
          placeholder="שאל שאלה על הוצאה לפועל..."
          aria-label="שאל שאלה על הוצאה לפועל"
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
