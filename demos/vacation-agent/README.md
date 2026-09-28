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

במסלול החי, המצב המתומצת של הדף נשלח ל-TypeSafe AI, והסיכום נשלח ל-Bedrock. זה עשוי לעלות כסף. ב-AgentCore הדף נטען כ-data URL, כי הדפדפן בענן לא מגיע ל-localhost.

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

15 בדיקות: פענוח הדף ורשימת הפעולות; דחייה של בחירה תקינה אבל שגויה בלי לחיצה; מלון שהתמלא בין הבחירה ללחיצה; מזהה לא מוכר או כפתור תשלום שאף פעם לא נלחצים; מחיר חסר או משובש שנחשב הפרה; שלושת התרחישים והמסלול המדויק של sold-out; הבוחר הרשלן, והמשוב שהוא מקבל אחרי דחייה; מגבלת צעדים; הקריאה ל-Jev דרך ה-SDK; המתכנן עם כלי אחד שרץ פעם אחת בלבד; וה-data URL של AgentCore. הבדיקות משתמשות בדפדפן מדומה; תרחישי ה-CLI רצים ב-Chromium אמיתי. אלה בדיקות תוכנה, לא eval של איכות מודל.

## גבולות הדמו

האתר נשלט ומסומן במזהים יציבים. אתר אמיתי מוסיף התחברות, חלונות קופצים, שינויים במבנה ותנאי שימוש. טקסט בדף הוא מידע, לא הרשאה: הבדיקה של `select_hotel` נשענת על שדות הדף ועל התנאים בקוד, לא על מה שהמלון כותב על עצמו. במוצר אמיתי, מחיר וזמינות נבדקים שוב בצד השרת בזמן ההזמנה.

מקורות: https://docs.typesafe.ai/sdk/javascript, https://strandsagents.com/docs/user-guide/sdk/, https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/browser-tool.html
