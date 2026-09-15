# הוראות פריסה ל-GitHub Pages

## שלב אחר שלב

1. היכנס ל-GitHub וצור Repository חדש (למשל `hebrew-calendar-designer`).
2. העלה את כל קבצי הפרויקט (ללא node_modules או קבצים זמניים).
3. לך ל-**Settings** של ה-Repository.
4. בתפריט השמאלי בחר **Pages**.
5. תחת **Source** בחר **Deploy from a branch**.
6. בחר את ה-branch (בדרך כלל `main` או `master`).
7. בחר **/(root)**.
8. לחץ **Save**.
9. המתן מספר דקות עד שהאתר יהיה זמין.
10. הכתובת תהיה:  
    `https://<your-username>.github.io/<repository-name>/`

## הערות חשובות

- המערכת משתמשת בנתיבים **יחסיים** בלבד, ולכן עובדת גם תחת subdirectory.
- אין צורך ב-Backend.
- Service Worker ו-PWA יעבדו לאחר טעינה ראשונה מעל HTTPS (GitHub Pages מספק HTTPS).

## בדיקה לאחר פריסה

- פתח את האתר
- צור פרויקט חדש
- ודא ששמירה מקומית עובדת (רענון דף)
- בדוק Responsive בטלפון
