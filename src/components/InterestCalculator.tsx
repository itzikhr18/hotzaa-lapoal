/**
 * The previous estimator used approximated quarterly rates and could not
 * reproduce the authoritative balance of an enforcement file. Keep this
 * component intentionally non-calculating until a professionally reviewed
 * calculation engine and a complete official rate table are available.
 */
export default function InterestCalculator() {
  return (
    <section dir="rtl" className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-right">
      <p className="mb-2 text-sm font-bold text-amber-900">הכלי נמצא בבדיקה מקצועית</p>
      <h2 className="mb-3 text-xl font-bold text-gray-900">לא מציגים כרגע חישוב יתרה משוער</h2>
      <p className="mb-4 text-sm leading-relaxed text-gray-700">
        יתרת חוב בהוצאה לפועל תלויה בנתוני התיק, במועדי שינוי הריבית, בתשלומים,
        בהוצאות ובהחלטות שניתנו בתיק. כדי למנוע הצגה של סכום מטעה, החישוב הושהה
        עד להשלמת בדיקה מקצועית של הנוסחה ושל טבלת השיעורים הרשמית.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href="https://go.gov.il/ecagovernmentident"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg bg-blue-800 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900"
        >
          בדיקת יתרה באזור האישי הרשמי
        </a>
        <a
          href="/guides/bdika-tik/"
          className="inline-flex items-center justify-center rounded-lg border border-blue-800 bg-white px-5 py-3 text-sm font-bold text-blue-900 hover:bg-blue-50"
        >
          מדריך לבדיקת התיק
        </a>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-gray-600">
        האתר אינו מקבל כאן שם, טלפון, מספר תיק או מידע אישי אחר.
      </p>
    </section>
  );
}
