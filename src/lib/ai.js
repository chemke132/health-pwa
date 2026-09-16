import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Gemini 1.5 Flash client. The API key is read from VITE_GEMINI_API_KEY.
 *
 * ⚠️ Security note: a VITE_ env var is bundled into the browser, so this key is
 * visible to anyone who inspects the app. That's acceptable for a personal /
 * dev build (per spec), but for production move these calls behind a Supabase
 * Edge Function and keep the key server-side.
 */
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  // eslint-disable-next-line no-console
  console.error('[ai] Missing VITE_GEMINI_API_KEY — add it to .env.local and restart the dev server.');
}

const genAI = new GoogleGenerativeAI(apiKey);
// gemini-1.5/2.5-flash are closed to new users; 3.6-flash is the current flash tier.
const MODEL = 'gemini-3.6-flash';

/* ------------------------- System prompts (spec) ------------------------- */

const MEAL_SYSTEM_PROMPT =
  '너는 영양사 AI야. 사용자의 입력 텍스트를 분석해서 무조건 JSON 형식으로만 답해. ' +
  'JSON 키는 food_name, calories, protein, carbs, fat을 포함해야 해. 부연 설명은 절대 하지 마.';

const WORKOUT_SYSTEM_PROMPT =
  "다음은 OCR로 추출한 운동 앱 스크린샷 텍스트야. 글자가 깨져있더라도 문맥을 파악해서 " +
  "정확한 '운동 종류(workout_desc)', '소모 칼로리(burned_calories)', '운동 시간(duration_mins)'을 추출해 " +
  '무조건 JSON 형식으로만 답해. 부연 설명 금지.';

/* ------------------------------ Helpers --------------------------------- */

function numeric(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

/** Robustly pull JSON (object or array) out of a model response. */
function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    // Fallback: extract the first {...} or [...] block in case the model added prose.
    const match = text.match(/[[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]);
    throw new Error('AI 응답을 JSON으로 해석하지 못했어요.');
  }
}

/** Sum a numeric field across items (rounds the total). */
function sumField(items, key) {
  return Math.round(items.reduce((acc, it) => acc + (Number(it?.[key]) || 0), 0));
}

/* --------------------------- Feature 1: Meal ---------------------------- */

/**
 * Natural-language meal parsing.
 * e.g. "연어회 200g이랑 밥 반 공기 먹었어" → { food_name, calories, protein, carbs, fat }
 */
export async function parseMealText(text) {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: MEAL_SYSTEM_PROMPT,
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
  });

  const result = await model.generateContent(text);
  const data = parseJson(result.response.text());

  // The model may return a single object or an array (one entry per food).
  // Normalize both into one aggregated meal record.
  const items = Array.isArray(data)
    ? data
    : Array.isArray(data.items)
    ? data.items
    : [data];

  const names = items.map((i) => i?.food_name).filter(Boolean);

  return {
    food_name: names.join(', ') || text.trim(),
    calories: sumField(items, 'calories'),
    protein: sumField(items, 'protein'),
    carbs: sumField(items, 'carbs'),
    fat: sumField(items, 'fat'),
  };
}

/* ------------------- Feature 2: Workout (OCR → LLM) --------------------- */

/**
 * Send OCR'd (possibly garbled) screenshot text to Gemini and get structured
 * workout data back.
 * → { workout_desc, burned_calories, duration_mins }
 */
export async function parseWorkoutText(ocrText) {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: WORKOUT_SYSTEM_PROMPT,
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
  });

  const result = await model.generateContent(ocrText);
  const parsed = parseJson(result.response.text());
  // A screenshot is usually one workout; if an array comes back, take the first.
  const data = Array.isArray(parsed) ? parsed[0] ?? {} : parsed;

  return {
    workout_desc: data.workout_desc?.toString().trim() || '운동',
    burned_calories: numeric(data.burned_calories),
    duration_mins: numeric(data.duration_mins),
  };
}
