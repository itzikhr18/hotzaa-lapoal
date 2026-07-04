import { useEffect, useState } from 'react';
import LeadCaptureForm from './LeadCaptureForm';

const DISMISS_KEY = 'hotzaaLeadWidgetDismissedAt';
const DISMISS_TTL = 1000 * 60 * 60 * 24 * 7;

export default function LeadCaptureWidget() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // הכפתור עצמו תמיד גלוי; הסגירה משתיקה רק את הפתיחה האוטומטית ל-7 ימים.
    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL) return;

    const timer = window.setTimeout(() => setOpen(true), 9000);
    return () => window.clearTimeout(timer);
  }, []);

  function closeForNow() {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setOpen(false);
  }

  function closeAfterSuccess() {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    window.setTimeout(() => {
      setOpen(false);
    }, 3500);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-green-700 px-4 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-200"
        aria-label="פתח טופס בדיקת חובות ללא עלות"
      >
        בדיקה חינם
      </button>
    );
  }

  return (
    <aside
      dir="rtl"
      className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm"
      aria-label="חלונית בדיקת חובות"
    >
      <div className="relative">
        <button
          type="button"
          onClick={closeForNow}
          className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-2 py-1 text-sm font-bold text-gray-600 shadow-sm hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
          aria-label="סגור טופס בדיקת חובות"
        >
          ×
        </button>
        <LeadCaptureForm source="floating-widget" variant="compact" onSuccess={closeAfterSuccess} />
      </div>
    </aside>
  );
}
