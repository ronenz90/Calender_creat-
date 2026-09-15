# מחולל לוחות שנה — Hebrew Calendar Designer

מערכת Web מלאה ליצירת לוחות שנה עבריים מותאמים אישית, עם תמונות, עיצובים וייצוא PDF להדפסה.

**100% Client-Side · Offline · GitHub Pages Ready · פרטיות מלאה**

## Overview

המערכת מאפשרת יצירת לוחות שנה עבריים מקצועיים:

- שנים עבריות מתשפ״ז (5787) והלאה (כולל שנים מעוברות ואדר א׳/ב׳)
- תאריכים עבריים + לועזיים, שבתות, ראש חודש וחגים (ישראל)
- העלאת תמונות (JPG/PNG/WEBP) + פריסות אוטומטיות (1–6 תמונות)
- 6 תבניות עיצוב מלאות
- שמירה אוטומטית ב-IndexedDB
- ייצוא PDF אמיתי (A4 Landscape) עם כל החודשים
- ייצוא/ייבוא פרויקט מלא כ-ZIP
- ממשק עברי מלא RTL + Responsive + PWA

## Features

- Dashboard עם כרטיסי פרויקטים, שכפול ומחיקה
- אשף יצירה (שם → שנה → עיצוב)
- עורך חודשים עם Preview חי
- החל עיצוב/פריסה על חודש בודד או על כל השנה
- Auto-save
- אופטימיזציית תמונות
- Progress bar בהפקת PDF
- Empty states + Toast notifications

## Requirements

דפדפן מודרני (Chrome, Edge, Firefox, Safari) עם תמיכה ב:
IndexedDB, ES Modules, File API, Canvas

## Run Locally

**חובה להריץ דרך HTTP** (לא `file://`):

```bash
cd hebrew-calendar-designer
python -m http.server 8080
# או: npx serve .
```

פתח: http://localhost:8080

## GitHub Pages (חשוב)

המערכת בנויה עם **נתיבים יחסיים בלבד** ועובדת מצוין תחת subdirectory.

1. צור Repository חדש
2. העלה את כל הקבצים (או את תוכן ה-ZIP)
3. Settings → Pages
4. Source: Deploy from a branch → `main` / `root`
5. Save
6. האתר זמין ב:  
   `https://<username>.github.io/<repo-name>/`

אין צורך ב-Backend, אין צורך ב-build step.

## מבנה

```
hebrew-calendar-designer/
├── index.html
├── README.md
├── manifest.json
├── service-worker.js
├── css/          (main, dashboard, editor, components, responsive)
├── js/
│   ├── app.js
│   ├── calendar/calendar-engine.js
│   ├── storage/indexeddb.js
│   └── export/ (pdf + project zip)
├── vendor/       (jsPDF, JSZip)
├── assets/
└── docs/         (DEPLOYMENT, TESTING, DEVELOPMENT)
```

## פרטיות

התמונות והפרויקטים נשמרים **רק במכשיר שלך**.  
אין שליחה לשרת, אין Login, אין Analytics.

## License

MIT
