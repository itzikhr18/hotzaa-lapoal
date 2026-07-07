/**
 * הגבלת קצב בסיסית לפי כתובת IP — הגנה מפני שימוש לרעה ב-API.
 *
 * שומר מונה בזיכרון של ה-isolate (חלון הזזה פשוט). ב-Cloudflare זה
 * best-effort: כל isolate מחזיק מונה משלו, אבל זה מספיק כדי לבלום
 * לולאות אוטומטיות והצפות מכתובת אחת בלי תלות ב-KV.
 */

const buckets = new Map();
const MAX_TRACKED_IPS = 5000; // הגנה על זיכרון — איפוס כשעוברים את הסף

/**
 * @returns {boolean} true אם הבקשה חורגת מהמכסה ויש לחסום אותה
 */
export function isRateLimited(request, { limit = 20, windowMs = 60_000 } = {}) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const now = Date.now();

  if (buckets.size > MAX_TRACKED_IPS) buckets.clear();

  const bucket = buckets.get(ip);
  if (!bucket || now - bucket.start > windowMs) {
    buckets.set(ip, { start: now, count: 1 });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}
