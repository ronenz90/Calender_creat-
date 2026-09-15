# Development Guide

## Architecture

- **Pure Client-Side** (HTML + CSS + ES Modules)
- **No Backend / No Framework**
- Modules:
  - `js/calendar/` — date engine + holidays
  - `js/storage/` — IndexedDB layer
  - `js/app.js` — UI state + orchestration

## Adding a new Template

1. הוסף אובייקט ל-`TEMPLATES` ב-`app.js`
2. הגדר colors
3. העיצוב משפיע על preview אוטומטית

## Adding a Layout

1. הוסף ל-`LAYOUTS`
2. עדכן את renderPreview לטפל ב-slots

## Hebrew Calendar

המנוע משתמש ב-`Intl.DateTimeFormat` עם `he-u-ca-hebrew` להמרה אמינה,  
ומוסיף רשימת חגים קבועה לפי כללי ישראל.

## Storage

כל הנתונים ב-IndexedDB.  
תמונות נשמרות כ-DataURL (ניתן לשפר ל-Blob בעתיד).

## Future Extensions

- אירועים אישיים / ימי הולדת
- Undo/Redo מלא
- PDF אמיתי עם jsPDF (כבר ב-vendor)
- Import ZIP מלא
- A3 / Portrait
