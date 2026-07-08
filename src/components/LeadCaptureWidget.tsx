import { useEffect, useRef, useState } from 'react';
import LeadCaptureForm from './LeadCaptureForm';

const DISMISS_KEY = 'hotzaaLeadWidgetDismissedAt';
const DISMISS_TTL = 1000 * 60 * 60 * 24 * 7;

export default function LeadCaptureWidget() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openedByUser = useRef(false);

  // פתיחה אוטומטית: רק בדסקטופ, לא בעמודי הכלים (המשתמש באמצע אינטראקציה), פעם ב-7 ימים.
  useEffect(() => {
    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL) return;
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    const onToolPage = window.location.pathname.startsWith('/tools/');
    if (!isDesktop || onToolPage) return;

    const timer = window.setTimeout(() => setOpen(true), 30000);
    return () => window.clearTimeout(timer);
  }, []);

  // ניהול פוקוס + Escape כשהפאנל פתוח.
  useEffect(() => {
    if (!open) return;
    if (openedByUser.current) closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeForNow();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function openPanel() {
    openedByUser.current = true;
    setOpen(true);
  }

  function closeForNow() {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setOpen(false);
    if (openedByUser.current) window.setTimeout(() => triggerRef.current?.focus(), 0);
    openedByUser.current = false;
  }

  function closeAfterSuccess() {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    window.setTimeout(() => setOpen(false), 3500);
    openedByUser.current = false;
  }

  if (!open) {
    return (
      <button
        ref={triggerRef}
        type="button"
        onClick={openPanel}
        className="fixed bottom-20 right-5 sm:bottom-5 z-40 rounded-full bg-green-700 px-4 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-200"
        aria-label="פתח טופס יצירת קשר עם עורך דין — שיחת ייעוץ ללא עלות"
      >
        שיחת ייעוץ — חינם
      </button>
    );
  }

  return (
    <aside
      dir="rtl"
      role="dialog"
      aria-modal="false"
      aria-label="טופס יצירת קשר עם עורך דין"
      className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl"
    >
      <div className="relative">
        <button
          ref={closeRef}
          type="button"
          onClick={closeForNow}
          className="absolute left-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-xl font-bold text-gray-600 shadow-sm hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
          aria-label="סגור טופס"
        >
          ×
        </button>
        <LeadCaptureForm source="floating-widget" variant="compact" onSuccess={closeAfterSuccess} />
      </div>
    </aside>
  );
}
