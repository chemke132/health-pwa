// Supabase Edge Function: ai-parse
// Server-side Gemini call so the API key never reaches the browser.
// Client sends { kind: 'meal' | 'workout', text }, gets back the model's JSON
// (object or array); the client normalizes it.
//
// Deploy (dashboard): Edge Functions → Deploy a new function → paste this file.
// Secret:  set GEMINI_API_KEY in Edge Functions → Secrets.
// (CLI alt:  supabase functions deploy ai-parse
//            supabase secrets set GEMINI_API_KEY=xxxx)
//
// NOTE: the system prompts below must stay in sync with src/lib/ai.js.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const MODEL = 'gemini-3.6-flash';

const MEAL_SYSTEM_PROMPT =
  '너는 영양사 AI야. 사용자의 입력 텍스트를 분석해서 무조건 JSON 형식으로만 답해. ' +
  'JSON 키는 food_name, calories, protein, carbs, fat을 포함해야 해. 부연 설명은 절대 하지 마.';

const WORKOUT_SYSTEM_PROMPT =
  "다음은 OCR로 추출한 운동 앱 스크린샷 텍스트야. 글자가 깨져있더라도 문맥을 파악해서 " +
  "정확한 '운동 종류(workout_desc)', '소모 칼로리(burned_calories)', '운동 시간(duration_mins)'을 추출해 " +
  '무조건 JSON 형식으로만 답해. 부연 설명 금지.';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!GEMINI_API_KEY) return json({ error: 'GEMINI_API_KEY not set' }, 500);

    const { kind, text, names, targetLang, weight, height, bmr } = await req.json();

    let body;
    if (kind === 'workout_estimate') {
      if (!text || !String(text).trim()) return json({ error: 'text required' }, 400);
      const stats =
        `weight ${weight ?? 'unknown'} kg, height ${height ?? 'unknown'} cm, ` +
        `BMR ${bmr ?? 'unknown'} kcal/day`;
      const prompt =
        `You are a fitness AI. Estimate the calories burned for the workout below ` +
        `for a person with these stats: ${stats}. Account for exercise type, ` +
        `intensity and duration. Reply with ONLY a JSON object: ` +
        `{"workout_desc": short name, "burned_calories": integer kcal, ` +
        `"duration_mins": integer minutes}. If duration is not stated, estimate a ` +
        `reasonable one.\nWorkout: ${String(text)}`;
      body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      };
    } else if (kind === 'translate') {
      if (!Array.isArray(names) || names.length === 0) {
        return json({ error: 'names required' }, 400);
      }
      const langName = targetLang === 'ko' ? 'Korean' : 'English';
      const prompt =
        `Translate each of these food names to ${langName}. Keep quantities and ` +
        `units (e.g. 200g, 2 scoops). Reply with ONLY a JSON object mapping each ` +
        `original string exactly to its translation.\nNames: ${JSON.stringify(names)}`;
      body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      };
    } else {
      if (!text || !String(text).trim()) return json({ error: 'text required' }, 400);
      const systemPrompt =
        kind === 'workout' ? WORKOUT_SYSTEM_PROMPT : MEAL_SYSTEM_PROMPT;
      body = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: String(text) }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      };
    }

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!resp.ok) {
      const detail = await resp.text();
      return json({ error: 'gemini_error', detail }, 502);
    }

    const data = await resp.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    // Return the parsed JSON as-is; the client normalizes object/array shapes.
    return json({ result: JSON.parse(raw) }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
