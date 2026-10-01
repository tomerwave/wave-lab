# שלחנו סוכן להזמין חופשה

הדמו של ההרצאה "שלחנו סוכן להזמין חופשה, ואז התערבתם". TypeScript + Node.js + Playwright, עם Jev לבחירת פעולה, Strands Agents כמתכנן ו-AgentCore Browser כדפדפן בענן.

הרעיון אחד: המודל בוחר מזהה מתוך רשימה. הקוד קובע מה ברשימה, בודק ומבצע.

## התחלה מהירה

Node 22.13 ומעלה. ההתקנה דורשת אינטרנט. שלושת תרחישי הבמה לא דורשים מפתח API או חשבון AWS, אבל כן דורשים Chromium מקומי.

```sh
npm ci
npx playwright install chromium
npm run demo:vacation -- happy
npm run demo:vacation -- sold-out
npm run demo:vacation -- budget-drop
```

על הבמה, כדי שהקהל יראה את הדפדפן:

```sh
HEADED=1 SLOW_MO_MS=600 npm run demo:vacation -- sold-out
```

| תרחיש | מה רואים |
|---|---|
| happy | מלון A פנוי, נגיש ובתקציב. הסוכן בוחר בו ועוצר לפני תשלום |
| sold-out | מלון A מלא. הסוכן חוזר לתוצאות, מדלג על B הלא נגיש ובוחר ב-C |
| budget-drop | התקציב יורד ל-500 אירו. אין מלון שעומד בכל התנאים, והסוכן עוצר ושואל |
| sold-out --chooser careless | בוחר "רשלן" מנסה לבחור את B הלא נגיש. הקוד דוחה (not_accessible) והלולאה ממשיכה |

כל הבחירות בתרחישים האלה מתוסרטות ומסומנות כך בפלט. האתר, המלונות והמחירים בדויים, ואין באתר תשלום.

## אתר החופשות

https://vacation-agent-rehearsal.vercel.app הוא אתר חופשות בדוי. כפתורי המגיש, הבחירות והפלט נמצאים בטרמינל בלבד. האתר הציבורי אינו מפעיל סוכן או שירות מודל.

לגיבוי מקומי עם תמונות ללא אינטרנט, אחרי התקנת התלויות:

```sh
npm run build:site --workspace=@tomerwave/vacation-agent
python3 -m http.server 4173 --directory demos/vacation-agent/dist/site
```

הפעילו את פקודת הסוכן עם `--site-url http://localhost:4173` במקום הכתובת הציבורית.

## התערבות באותו סשן

```sh
HEADED=1 npm run demo:vacation -- happy --interactive --site-url https://vacation-agent-rehearsal.vercel.app
```

הטרמינל הוא מקום השליטה של המגיש; באתר הציבורי מוצג רק אתר הזמנות בדוי, בלי קונסולת סוכן. הסשן מתחיל בהשהיה. `next` משחרר נקודת עצירה אחת: לפני החלטה ואז לפני לחיצה. `run` ממשיך אוטומטית, `pause` עוצר בנקודת העצירה הבאה, ו-`stop` מבטל גם המתנה לבחירת המודל. `sold-out A` ו-`restore-hotel A` משנים זמינות; `budget 500` ו-`budget 600` משנים תקציב. שינויים שמגיעים בזמן קריאת מודל ממתינים לנקודת העצירה, והחלטה מהגרסה הישנה נדחית לפני לחיצה. אין התאמה? הסשן ממתין: שחזרו תקציב ואז `next` או `run`. הדפדפן, ההיסטוריה ומזהה הריצה נשארים באותו סשן. `reset` בזמן ריצה מבטל את הסשן הנוכחי ומתחיל ריצה חדשה עם מזהה חדש באותו דפדפן. אחרי סיום רגיל או `stop`, ה-CLI נסגר; כדי להתחיל מחדש הריצו שוב את הפקודה. Ctrl-C, SIGTERM וסגירת הקלט מבטלים את הריצה וסוגרים את הדפדפן.

להדגמת החלטה שהתיישנה: `next` עד שמופיעה `before_click` עם `select_hotel`, ואז `sold-out A` ו-`next`. רואים `world_changed` בלי לחיצה. הפלט כולל מצב ריצה וגרסת עולם. פקודות המגיש אינן כלי של הסוכן, וכפתור התשלום נשאר מושבת.

לגיבוי עם תמונות ללא אינטרנט, השתמשו באתר המקומי שנבנה למעלה. אפשר גם להסיר `--site-url`: אותו דפדפן ואותה לולאה עובדים מול HTML בזיכרון; תמונות האווירה בגרסה הזאת עשויות לדרוש רשת.

אותו `--interactive` עובד עם דגלי המסלול החי למטה; הוא אינו מחליף Jev או AWS בבחירות מתוסרטות. השימוש החי עשוי לעלות כסף ולא נבדק מול השירותים. לחזרה ללא עלויות מודל השתמשו בברירות המחדל המתוסרטות ובדפדפן המקומי; פלטי `examples` הם גיבוי מוקלט ומסומן.

## המסלול החי, אופציונלי

כל חלק מתחלף בנפרד:

```sh
npm run demo:vacation -- sold-out --chooser jev
npm run demo:vacation -- sold-out --browser agentcore
npm run demo:vacation -- sold-out --chooser jev --browser agentcore --planner strands
```

| דגל | מה מתחלף | מה צריך |
|---|---|---|
| `--chooser jev` | Jev של TypeSafe AI בוחר את הפעולה במקום הבחירה המתוסרטת | `TYPESAFE_API_KEY` |
| `--browser agentcore` | AgentCore Browser מריץ את הדף בענן, והפלט כולל קישור Live View | `AWS_REGION` והרשאות AWS ל-AgentCore |
| `--planner strands` | סוכן Strands על Amazon Bedrock מפעיל את כלי `find_hotel` ומסכם | `AWS_REGION`, גישה למודל ב-Bedrock, ואפשר `BEDROCK_MODEL_ID` |

במסלול החי, המצב המתומצת של הדף נשלח ל-TypeSafe AI, והסיכום נשלח ל-Bedrock. זה עשוי לעלות כסף. בלי `--site-url`, AgentCore טוען את הדף כ-data URL. עם `--site-url`, הוא פותח את האתר הציבורי. הדפדפן בענן לא מגיע ל-localhost.

המסלול החי לא נבדק כאן מול השירותים עצמם. נבדקו: הקריאה ל-SDK של TypeSafe עם fetch מדומה, בניית הסוכן של Strands עם כלי אחד, וה-data URL ש-AgentCore טוען. יש לתרגל מול החשבונות שלכם לפני ההרצאה; אין הבטחה לאותו רצף בחירות.

## קבצים שכדאי לפתוח על הבמה

- `src/compact.ts`: מה Jev מקבל. מצב קצר, מלונות שנפסלו (`ruled_out`), הדחייה האחרונה (`last_result`) ורשימת פעולות. לא צילום מסך.
- `src/jev.ts`: הקריאה ל-`client.systemOne` עם `choice`.
- `src/registry.ts`: כל מזהה ממופה לפעולה, ו-`select_hotel` בודק תקציב ונגישות בקוד.
- `src/executor.ts`: בין הבחירה ללחיצה. קוראים מצב עדכני, בודקים שהפעולה עדיין מותרת, ורק אז לוחצים.
- `src/loop.ts`: הלולאה, מגבלת הצעדים ו-`stop`.
- `src/planner.ts`: המתכנן של Strands. יש לו כלי אחד, בלי קלט, ולכן הוא לא יכול לשנות את התנאים.
- `src/site.ts`: אתר הדמו עם מזהים יציבים (`data-testid`).
- `examples`: פלטים מריצה מקומית, גם כגיבוי לבמה.

## המצגת

`talk/agent-vacation.pptx` עם הערות דובר, ו-`talk/agent-vacation.pdf` לתצוגה בכל מחשב. ה-PowerPoint משתמש ב-Frank Ruhl Libre, Assistant, Fraunces, Instrument Sans ו-JetBrains Mono. בלי הפונטים האלה PowerPoint מחליף אותם בשקט, וה-PDF נשאר הגרסה הבטוחה.

## בדיקות ובנייה

```sh
npm run typecheck
npm test
npm run build
```

27 בדיקות: פענוח הדף ורשימת הפעולות; דחייה של בחירה תקינה אבל שגויה בלי לחיצה; מלון שהתמלא בין הבחירה ללחיצה; מזהה לא מוכר או כפתור תשלום שאף פעם לא נלחצים; מחיר חסר או משובש שנחשב הפרה; שלושת התרחישים והמסלול המדויק של sold-out; הבוחר הרשלן, והמשוב שהוא מקבל אחרי דחייה; מגבלת צעדים; הקריאה ל-Jev דרך ה-SDK; המתכנן עם כלי אחד שרץ פעם אחת בלבד; וה-data URL של AgentCore. נוספו בדיקות לתקציב עדכני, שינויים בזמן החלטה, התאוששות באותה ריצה, ביטול החלטה, timeout, פקודות חוזרות ו-Stop בזמן קריאת checkout, ופלט כישלון שלא ממציא החלטה מתוסרטת. הבדיקות משתמשות בדפדפן מדומה; תרחישי ה-CLI רצים ב-Chromium אמיתי. אלה בדיקות תוכנה, לא eval של איכות מודל.

## גבולות הדמו

האתר נשלט ומסומן במזהים יציבים. אתר אמיתי מוסיף התחברות, חלונות קופצים, שינויים במבנה ותנאי שימוש. טקסט בדף הוא מידע, לא הרשאה: הבדיקה של `select_hotel` נשענת על שדות הדף ועל התנאים בקוד, לא על מה שהמלון כותב על עצמו. במוצר אמיתי, מחיר וזמינות נבדקים שוב בצד השרת בזמן ההזמנה.

מקורות: https://docs.typesafe.ai/sdk/javascript, https://strandsagents.com/docs/user-guide/sdk/, https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/browser-tool.html
