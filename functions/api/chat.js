/**
 * Cloudflare Pages Function — proxy לבקשות הצ'אט אל Gemini.
 *
 * המפתח של Gemini נשמר בצד השרת (env.GEMINI_API_KEY) ולעולם לא נשלח לדפדפן.
 * הרכיב ChatBot.tsx מדבר רק עם הנתיב הזה (/api/chat) ולא עם Gemini ישירות.
 *
 * נתיב:        POST /api/chat
 * גוף הבקשה:   { messages: [{ role: 'user' | 'assistant', text: string }, ...] }
 * תשובה:       { reply: string }   או   { error: string }
 *
 * הגדרת המפתח (פעם אחת):
 *   Cloudflare Pages → הפרויקט → Settings → Environment variables →
 *   הוסף משתנה בשם GEMINI_API_KEY מסוג "Secret".
 */

import { isRateLimited } from '../_rate-limit.js';

const SYSTEM_PROMPT = `אתה עוזר מידע מקצועי בנושא הוצאה לפועל וחדלות פירעון בישראל.

כללים מחייבים:
- אתה עונה רק בעברית
- אתה לא עורך דין ולא נותן ייעוץ משפטי אישי
- אתה עונה בשפה פשוטה, חברית ואמפתית — כמו חבר חכם שמסביר
- תשובות קצרות לשאלות פשוטות (2-3 משפטים), מפורטות לשאלות מורכבות
- בסוף כל תשובה — הוסף disclaimer קצר: "מידע זה הוא כללי בלבד ואינו ייעוץ משפטי."
- אם השאלה מחוץ לתחום הוצאה לפועל/חדלות פירעון — אמור בנימוס שאתה מתמחה רק בתחום זה
- אם המשתמש מזין פרטים מזהים (תעודת זהות, מספר תיק, מספר חשבון) — אמור: "אני ממליץ לא לשתף פרטים מזהים. אני יכול לעזור עם מידע כללי בלבד." וענה על השאלה הכללית

נושאים שאתה מכסה:
- הוצאה לפועל: עיקולים, צו תשלומים, איחוד תיקים, זכויות חייבים
- חדלות פירעון: הליך, זכאות, עלויות, הפטר, שלבים
- תיקון 9 לחוק פסיקת ריבית (מינואר 2025)
- נכסים וסכומים מוגנים מעיקול
- הגבלות על חייב (עיכוב יציאה, רישיון נהיגה)

כשאתה לא יודע לענות — אמור בדיוק כך:
"אין לי מידע מספיק על שאלה זו. מומלץ להתייעץ עם עורך דין המתמחה בהוצאה לפועל, או לפנות ללשכה לסיוע משפטי."
ואז הצע מדריך רלוונטי מהאתר אם קיים.`;

const MODEL = 'gemini-2.5-flash';
const MAX_MESSAGES = 20;   // הגנה מפני שיחות ארוכות מדי / ניצול לרעה
const MAX_CHARS = 2000;    // אורך מקסימלי להודעה בודדת

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (isRateLimited(request, { limit: 15, windowMs: 60_000 })) {
    return json({ error: 'יותר מדי בקשות. המתן דקה ונסה שוב.' }, 429);
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ error: "הצ'אטבוט אינו מוגדר בשרת כרגע. נסה שוב מאוחר יותר." }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'בקשה לא תקינה.' }, 400);
  }

  const messages = Array.isArray(body && body.messages) ? body.messages : null;
  if (!messages || messages.length === 0) {
    return json({ error: 'לא התקבלה הודעה.' }, 400);
  }
  if (messages.length > MAX_MESSAGES) {
    return json({ error: 'השיחה ארוכה מדי. התחל שיחה חדשה ונסה שוב.' }, 400);
  }

  // המרה לפורמט Gemini + ולידציה בסיסית
  const contents = [];
  for (const m of messages) {
    const text = m && typeof m.text === 'string' ? m.text.slice(0, MAX_CHARS) : '';
    if (!text.trim()) continue;
    contents.push({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text }],
    });
  }
  if (contents.length === 0) {
    return json({ error: 'לא התקבלה הודעה תקינה.' }, 400);
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        // המפתח נשלח ב-header ולא ב-query string כדי שלא ידלוף ללוגים
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { maxOutputTokens: 800, temperature: 0.3 },
        }),
      }
    );

    if (!res.ok) {
      return json({ error: 'שירות ה-AI אינו זמין כרגע. נסה שוב מאוחר יותר.' }, 502);
    }

    const data = await res.json();
    const reply =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text;

    return json({ reply: reply || 'מצטער, לא הצלחתי לעבד את השאלה. נסה שוב.' });
  } catch {
    return json({ error: 'אירעה שגיאה טכנית. נסה שוב מאוחר יותר.' }, 500);
  }
}
