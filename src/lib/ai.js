import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabase';

/**
 * AI parsing with two transports:
 *  - DEV: if VITE_GEMINI_API_KEY is set, call Gemini directly from the browser
 *    (fast iteration; key is exposed — dev only).
 *  - PROD: if the key is absent, call the `ai-parse` Supabase Edge Function,
 *    which holds the key server-side. Deploy that function + set GEMINI_API_KEY
 *    as a secret, and simply omit VITE_GEMINI_API_KEY from the production build.
 *
 * Keep the system prompts here in sync with supabase/functions/ai-parse/index.ts.
 */
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const USE_DIRECT = Boolean(apiKey);

// gemini-1.5/2.5-flash are closed to new API users; 3.6-flash is the current flash tier.
const MODEL = 'gemini-3.6-flash';

const MEAL_SYSTEM_PROMPT =
  '너는 영양사 AI야. 사용자의 입력 텍스트를 분석해서 무조건 JSON 형식으로만 답해. ' +
  'JSON 키는 food_name, calories, protein, carbs, fat을 포함해야 해. 부연 설명은 절대 하지 마.';

const WORKOUT_SYSTEM_PROMPT =
  "다음은 OCR로 추출한 운동 앱 스크린샷 텍스트야. 글자가 깨져있더라도 문맥을 파악해서 " +
  "정확한 '운동 종류(workout_desc)', '소모 칼로리(burned_calories)', '운동 시간(duration_mins)'을 추출해 " +
  '무조건 JSON 형식으로만 답해. 부연 설명 금지.';

const genAI = USE_DIRECT ? new GoogleGenerativeAI(apiKey) : null;

/* ------------------------------ transport ------------------------------- */

/**
 * Returns the model's parsed JSON for a given kind.
 * `payload` is a string for meal/workout, or { names, targetLang } for translate.
 * Chooses the direct SDK or the Edge Function based on USE_DIRECT.
 */
async function callGemini(kind, payload) {
  if (USE_DIRECT) {
    let systemInstruction;
    let userText;
    if (kind === 'translate') {
      const langName = payload.targetLang === 'ko' ? 'Korean' : 'English';
      userText =
        `Translate each of these food names to ${langName}. Keep quantities and ` +
        `units. Reply with ONLY a JSON object mapping each original string exactly ` +
        `to its translation.\nNames: ${JSON.stringify(payload.names)}`;
    } else {
      systemInstruction = kind === 'workout' ? WORKOUT_SYSTEM_PROMPT : MEAL_SYSTEM_PROMPT;
      userText = payload;
    }
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: kind === 'translate' ? 0 : 0.2,
      },
    });
    const result = await model.generateContent(userText);
    return parseJson(result.response.text());
  }

  // Edge Function path (key stays server-side).
  const body =
    kind === 'translate'
      ? { kind, names: payload.names, targetLang: payload.targetLang }
      : { kind, text: payload };
  const { data, error } = await supabase.functions.invoke('ai-parse', { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.detail || data.error);
  return data.result;
}

/* ------------------------------ helpers --------------------------------- */

function numeric(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

function sumField(items, key) {
  return Math.round(items.reduce((acc, it) => acc + (Number(it?.[key]) || 0), 0));
}

/** Robustly pull JSON (object or array) out of a model response string. */
function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/[[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]);
    throw new Error('AI 응답을 JSON으로 해석하지 못했어요.');
  }
}

/* --------------------------- Feature 1: Meal ---------------------------- */

/**
 * Natural-language meal parsing.
 * e.g. "연어회 200g이랑 밥 반 공기 먹었어" → { food_name, calories, protein, carbs, fat }
 */
export async function parseMealText(text) {
  const data = await callGemini('meal', text);

  // The model may return a single object or an array (one entry per food).
  const items = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
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
 * Structure (possibly garbled) OCR text into a workout record.
 * → { workout_desc, burned_calories, duration_mins }
 */
/* ------------------------- Translate food names ------------------------- */

/**
 * Translate a list of food names to `targetLang` ('ko' | 'en').
 * Returns a map { originalName: translatedName }. Unknowns fall back to original.
 */
export async function translateFoodNames(names, targetLang) {
  const unique = [...new Set(names.filter((n) => n && n.trim()))];
  if (!unique.length) return {};
  const data = await callGemini('translate', { names: unique, targetLang });
  const out = {};
  for (const n of unique) {
    out[n] = data && data[n] ? String(data[n]) : n;
  }
  return out;
}

export async function parseWorkoutText(ocrText) {
  const parsed = await callGemini('workout', ocrText);
  const data = Array.isArray(parsed) ? parsed[0] ?? {} : parsed;

  return {
    workout_desc: data?.workout_desc?.toString().trim() || '운동',
    burned_calories: numeric(data?.burned_calories),
    duration_mins: numeric(data?.duration_mins),
  };
}
