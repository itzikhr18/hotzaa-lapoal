# הוצאהלפועל.info — סקלטון פרויקט Astro

## הקמה ראשונית

```bash
# שלב 1: התקנת תלויות
npm install

# שלב 2: הפעלת שרת פיתוח
npm run dev
# → http://localhost:4321

# שלב 3: בניית האתר לייצור
npm run build
```

## דרישות מערכת

- **Node.js 18+** (בדוק עם `node -v`)
- **npm 9+**

---

## מבנה הפרויקט

```
src/
├── layouts/
│   ├── BaseLayout.astro      ← מבנה HTML בסיסי + SEO מטא
│   └── GuideLayout.astro     ← תבנית מדריך עם sidebar + breadcrumb
│
├── components/
│   ├── Header.astro          ← ניווט עם תפריט מובייל
│   ├── Footer.astro          ← footer עם קישורים
│   ├── Disclaimer.astro      ← כיתובי הגנה (3 גרסאות)
│   ├── CTAForm.astro         ← טופס ליד עם opt-in
│   └── InterestCalculator.tsx ← מחשבון ריבית תיקון 9 (React Island)
│
├── pages/
│   ├── index.astro           ← עמוד בית
│   ├── guides/
│   │   ├── index.astro       ← רשימת מדריכים
│   │   └── ikul-heshbon.astro ← מדריך עיקול חשבון (דוגמה מלאה)
│   └── tools/
│       └── calculator.astro  ← עמוד מחשבון ריבית
│
└── styles/
    └── global.css            ← RTL + Tailwind + custom classes
```

---

## צ'קליסט לפני השקה

### חובה לפני כל פרסום
- [ ] עדכן `astro.config.mjs` עם הדומיין האמיתי
- [ ] החלף `G-XXXXXXXXXX` ב-`BaseLayout.astro` עם מזהה GA4 אמיתי
- [ ] הוסף דף תנאי שימוש: `src/pages/legal/terms.astro`
- [ ] הוסף דף מדיניות פרטיות: `src/pages/legal/privacy.astro`
- [ ] רישום מאגר מידע (רשות הגנת הפרטיות)
- [ ] בדיקה משפטית של כל ה-Disclaimers
- [ ] חוזה בכתב עם כל עורך דין לפני קבלת לידים

### עדכונים שוטפים
- [ ] עדכן ריבית רבעונית ב-`InterestCalculator.tsx` (קובץ `RATES`)
  → מקור: https://mof.gov.il (אגף החשב הכללי)
- [ ] עדכן סכומי סף חדלות פירעון מדי שנה
- [ ] הוסף 2-3 מדריכים חדשים כל חודש לפחות

---

## הוספת מדריך חדש

1. צור קובץ: `src/pages/guides/[slug].astro`
2. השתמש ב-`GuideLayout` עם:
   - `title` — H1 עם מילת מפתח
   - `description` — מטא תיאור (עד 155 תווים)
   - `breadcrumb` — מסלול ניווט
   - `schema` — FAQPage JSON-LD אם יש שאלות
3. כתוב תוכן 1,500-2,500 מילים
4. הוסף `<slot name="next-steps">` עם קישורים לעמודים קשורים
5. הוסף לרשימה ב-`src/pages/guides/index.astro`

---

## פריסה ל-Cloudflare Pages (מומלץ)

```bash
# 1. Push ל-GitHub
git init && git add . && git commit -m "init"
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main

# 2. ב-Cloudflare Pages:
#    - Build command: npm run build
#    - Build output: dist
#    - Node version: 18
```

---

## מקורות מידע לתוכן

| נושא | מקור |
|------|------|
| חוק ההוצאה לפועל | https://www.nevo.co.il |
| ריבית עדכנית | https://mof.gov.il |
| טפסים רשמיים | https://www.gov.il/he/departments/topics/enforcement-and-collection |
| חדלות פירעון | https://www.justice.gov.il/insolvency |

---

*פרויקט: הוצאהלפועל.info | מרץ 2026*
