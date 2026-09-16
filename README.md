# Health PWA

An adaptive (mobile / desktop) Progressive Web App for tracking meals, workouts, and weight — with AI natural-language parsing and OCR-based hybrid input.

## Tech Stack

- **Core**: React, Vite, React Router
- **Styling / Animation**: Tailwind CSS, Framer Motion
- **State**: Zustand
- **Backend / Auth**: Supabase (email magic link / Google OAuth, Postgres + Row Level Security)
- **AI**: Google Gemini 1.5 Flash (`@google/generative-ai`)
- **OCR**: tesseract.js (Web Worker, background pre-load)
- **i18n**: react-i18next (KO / EN)
- **Time**: date-fns / date-fns-tz (anchored to US Pacific Time)

## Features

- **Adaptive UI** — mobile: bubble tab bar (Framer Motion `layoutId`); desktop: sidebar + grid dashboard.
- **Meal logging** — (1) favorite-meal chips that insert hardcoded nutrition directly (no Gemini call, cost-optimized bypass); (2) natural-language input parsed into structured nutrition via Gemini.
- **Workout logging** — screenshot → Tesseract OCR → Gemini cleanup/structuring → saved.
- **Data** — fetch the last 30 days once on load, then filter locally per selected day.
- **Weight / goal** — profile metrics and per-day weight entries.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in your values
npm run dev
```

`.env.local`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GEMINI_API_KEY=...        # get one at https://aistudio.google.com/apikey
```

In the Supabase SQL Editor, create the `users` / `meals` / `workouts` / `weights` tables with their RLS policies.

## AI key: dev vs. production

The Gemini calls choose their transport automatically:

- **Dev** — if `VITE_GEMINI_API_KEY` is set, the browser calls Gemini directly (fast,
  but the key is bundled into the client and publicly visible).
- **Production** — leave `VITE_GEMINI_API_KEY` unset and the app calls the
  `ai-parse` Supabase Edge Function (`supabase/functions/ai-parse`), which keeps the
  key server-side. Deploy the function and set `GEMINI_API_KEY` as an Edge Function
  secret.

The system prompts live in both `src/lib/ai.js` and the Edge Function — keep them in sync.
