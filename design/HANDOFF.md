# VIPO — דמו Hero Lab | נקודת עצירה

## סטטוס: דמו בלבד — ממתין לאישור לפני העברה לאתר האמיתי

---

## מה זה?

דמו מלא של דף מוצר לכורסת עיסוי VC LUXURY.  
הקבצים נמצאים ב: `repos/3Massage-for-sale-VC/design/`

### קבצי הדמו:

| קובץ | תפקיד |
|-------|--------|
| `hero-lab.html` | הדף המלא — כל הסקשנים (hero → footer) |
| `css/hero-lab.css` | כל העיצוב — כולל אנימציות, flow, footer |
| `section2-lab.html` | לאב לסקשן 2 (4 גרסאות — לא בשימוש פעיל) |
| `css/section2-lab.css` | CSS לסקשן 2 לאב |
| `header-lab.html` | לאב הדר — לא בשימוש פעיל |

---

## עיצוב מחדש v2 — "Flowing Luxury" (סשן 25/06):

> עיצוב מחדש מלא של הדמו לרמה בינלאומית/מקצועית. גיבוי הגרסה הקודמת: `_pre-redesign-backup/`.

- **טיפוגרפיה**: גופן תצוגה חדש `Frank Ruhl Libre` (serif) לכותרות/מחירים; הגדלת כל סולם הפונטים (גוף ~0.8rem, כותרות 1.4rem, מחיר 2.3rem).
- **שבירת הלבן**: בסיס ivory חם רציף + שני אזורי navy כהים דרמטיים (ביקורות + "המכולה בדרך") עם פסי fade רכים שנמסים מ/אל ה-ivory; closing CTA + footer כהים.
- **חיבור בין סקשנים**: gold connector nodes (קו+נקודה זוהרת) בין הסקשנים הבהירים; eyebrows ממוספרים 01–04 (נרטיב); מעברי gradient זורמים.
- **HERO**: נוסף כפתור CTA ראשי (וואטסאפ) + שורת דחיפות.
- **אפקטים**: scroll-reveal משופר, orbs נעים (drift), shimmer על CTA, ספירת מספרים (count-up) בסטטיסטיקות ובדירוג, sticky שמתחבא בפוטר, תמיכה ב-`prefers-reduced-motion`.
- אומת ויזואלית ב-Playwright @480px (כל הסקשנים).

---

## מה בוצע (סשן קודם — v1):

### 1. שינויי צבעים
- `.sec-card-icon` — צבע: `var(--ink)` במקום gold, רקע: gradient מעודכן
- `.s8-icon` — רקע כחול-אפרפר (`#e8eef6 → #f0f4fa`), צבע `var(--ink-3)`
- `.s8-icon i.fas` — צבע `var(--navy)` (כלל חדש)

### 2. שדרוג חוויית גלילה אחידה (unified page flow)
- רקע body עם gradient זורם (לבן ↔ `#f8f9fb`)
- כל סקשן מקבל gradient רך שנמס לתוך הבא
- קוי מחברים עדינים בין סקשנים (`section + section::before`)
- עיגולי gradient דקורטיביים שנעים ברקע (main::before, main::after)
- כרטיסים עם glassmorphism (`backdrop-filter: blur`) + hover effects
- `.sec-card-title::after` — קו תחתון navy→gold

### 3. Scroll Reveal Animations
- קלאס `.reveal` על כל הכרטיסים/סקשנים העיקריים
- IntersectionObserver בJS — מוסיף `.is-visible` בגלילה
- Stagger delays (`.reveal-delay-1/2/3`) על גריד היתרונות (s3)
- אנימציה: fade + slide up עם cubic-bezier חלק

### 4. Footer מקצועי חדש
- רקע כהה (navy gradient) עם border-radius למעלה
- לוגו + tagline
- 2 עמודות: "צרו קשר" (טלפון/וואטסאפ/מייל) + "שעות פעילות"
- כרטיס מיקום עם **איור SVG של מפה מיניאטורית** (כבישים, בלוקים, pin זהוב + pulse)
- כפתורי רשתות חברתיות (FB, IG, TikTok)
- בר תחתון עם badges אמון + זכויות יוצרים + לינקים משפטיים

---

## מה נשאר לעשות (בצ'אט הבא):

1. **עדכון פרטי קשר אמיתיים** — טלפון, מייל, כתובת, ע.מ
2. **אישור סופי של הדמו** — רק אחרי אישור מפורש מהמשתמש
3. **העברה לאתר האמיתי** (`index.html`) — שילוב העיצוב החדש
4. **בדיקת תאימות מובייל** — הדמו ב-480px max, צריך לוודא responsive
5. **תמונות** — להחליף placeholders בתמונות אמיתיות

---

## חוקים חשובים:

> **אין להעביר שום דבר ל-index.html (האתר האמיתי) ללא אישור מפורש מהמשתמש.**  
> הדמו הוא sandbox בתיקיית `design/` בלבד.

---

## CSS Variables (הפלטה הנוכחית):

```css
--navy:     #1c2b46
--navy-2:   #243a5e
--gold:     #b08d57
--green:    #1a6b4a
--ink:      #1c2b46
--ink-2:    #5b6472
--ink-3:    #9aa3b2
--line:     #e6e9ee
--bg:       #ffffff
--bg-alt:   #f8f9fb
```

---

## איך לפתוח:

פתח בדפדפן:  
```
repos/3Massage-for-sale-VC/design/hero-lab.html
```

או דרך Live Server / local IP (ראה `_ip.ps1`).

---

*נוצר: 25/06/2026 00:24*
