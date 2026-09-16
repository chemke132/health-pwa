# Health PWA

모바일/데스크탑 적응형 PWA — 식단·운동·체중 기록. AI 자연어 파싱 + OCR 하이브리드 입력.

## Tech Stack

- **Core**: React, Vite, React Router
- **Styling / Animation**: Tailwind CSS, Framer Motion
- **State**: Zustand
- **Backend/Auth**: Supabase (email magic link / Google OAuth, Postgres + RLS)
- **AI**: Google Gemini 1.5 Flash (`@google/generative-ai`)
- **OCR**: tesseract.js (Web Worker, background pre-load)
- **i18n**: react-i18next (KO / EN)
- **Time**: date-fns / date-fns-tz (US Pacific 기준)

## Features

- **적응형 UI** — 모바일: 버블 탭바(Framer Motion `layoutId`), 데스크탑: 사이드바 + 그리드 대시보드
- **식사 기록** — ① 즐겨먹는 식단 칩(Gemini 호출 없이 바로 저장, 비용 최적화) ② 자연어 입력 → Gemini JSON 파싱
- **운동 기록** — 스크린샷 → Tesseract OCR → Gemini 보정 → 구조화 저장
- **데이터** — 앱 로드 시 최근 30일 한 번에 fetch 후 로컬 필터링
- **체중/목표** — 프로필 및 일자별 체중 기록

## Setup

```bash
npm install
cp .env.example .env.local   # 값 채우기
npm run dev
```

`.env.local`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GEMINI_API_KEY=...        # https://aistudio.google.com/apikey
```

Supabase SQL Editor에서 `users / meals / workouts / weights` 테이블 + RLS 정책을 생성해야 합니다.

## 보안 참고

`VITE_GEMINI_API_KEY`는 브라우저 번들에 노출됩니다. 개인/개발용에는 적합하지만, 프로덕션에서는
AI 호출을 Supabase Edge Function 등 서버로 옮겨 키를 숨기는 것을 권장합니다.
