# הכול בשליטה. כנראה שלו

TypeScript + Node.js + Mastra. אותו סיפור: דנה מבקשת החזר. מסלול קבוע, חקירה, כלי פגום, כלי מוגן וניסיון חוזר.

## התחלה מהירה

Node 22.13 ומעלה. נבדק כאן ב־Node 24.19.0. ההתקנה דורשת אינטרנט; חמשת תרחישי הבמה אינם דורשים מפתח API או מודל.

```sh
npm ci
npm run demo -- workflow
npm run demo -- investigate
npm run demo -- unsafe
npm run demo -- guarded
npm run demo -- retry
```

| מצב | מה רואים |
|---|---|
| workflow | Workflow אמיתי של Mastra מחזיר כפילות מאומתת של 99 ₪ |
| investigate | replay מסומן שמפעיל כלי Mastra אמיתיים, ללא בחירות מודל חי |
| unsafe | פונקציה פגומה מחזירה חיוב בחשבון לא מורשה |
| guarded | אותה בקשה בדיוק נחסמת: forbidden |
| retry | 20 קריאות מתוזמנות ועוד ניסיון חוזר, קבלה אחת |

כל ריצה מתחילה ממצב חדש. כל הכסף בדיוני. אין חיבור לספק תשלומים. הדוגמה הראשונה משתמשת בנתוני כפילות; החקירה משתמשת בחיוב יחיד בכל אחד משני חשבונות.

## קבצים שכדאי לפתוח על הבמה

- src/workflow.ts: מסלול קבוע עם createWorkflow ו־createStep.
- src/agent.ts: Agent של Mastra, הוראות וכלים. המודל בוחר את רצף הפעולות רק במצב live.
- src/tools.ts: createTool עם Zod; זהות והרשאות אינן חלק מקלט המודל.
- src/billing.ts: השוואת unsafeRefund ל־refund; בדיקת סמכות, זכאות ומניעת החזר חוזר.
- examples: פלטים מהרצה מקומית, גם כגיבוי לבמה.

## מודל חי, אופציונלי

הגדירו MODEL בפורמט provider/model ומפתח API תואם. לדוגמה, עם ספק OpenAI:

```sh
export MODEL='openai/gpt-4.1-mini'
# Set OPENAI_API_KEY securely in your shell; do not commit it.
npm run demo -- live
```

מצב live מפעיל Agent אמיתי, מעביר לספק את ההודעות ונתוני החיוב הבדיוניים ועשוי לעלות כסף. עד שישה צעדי מודל ו־90 שניות. צעד יכול להכיל יותר מקריאת כלי אחת. הכלי הפגום אינו חשוף למודל. אין כאן אחסון שיחות או שרת Studio; זו אפליקציית CLI קטנה שקל לפתוח ולהסביר.

הריצה החיה לא נבדקה כאן מול ספק אמיתי. נבדקו בניית ה־Agent ורשימת הכלים שלו, כלי Mastra וה־Workflow המקומיים. יש לתרגל מול המודל שלכם לפני ההרצאה; אין הבטחה לאותו רצף בחירות.

## בדיקות ובנייה

```sh
npm run typecheck
npm test
npm run build
node dist/demo.js guarded
```

שבע בדיקות: מדיניות, הכלי הפגום מול המוגן, בידוד נתונים, אימות קלט דרך Mastra, מאה קריאות חוזרות, Workflow אמיתי ורישום הכלים ב־Agent. אלה בדיקות תוכנה, לא eval של איכות מודל.

## גבולות הדמו

המצב בזיכרון בתהליך Node יחיד. אין await בין בדיקת הקבלה לשמירתה, ולכן קריאות אחרות באותו event loop אינן נכנסות באמצע. זה אינו פתרון עמיד להפעלות מחדש, מספר שרתים או תשלום אסינכרוני. במוצר אמיתי נדרשים אחסון עמיד, אטומיות ומפתח idempotency אצל ספק התשלום. זהות המשתמש כאן היא fixture של השרת, לא מערכת התחברות.

מקורות: https://mastra.ai/docs/agents/overview ו־https://mastra.ai/docs/workflows/overview
