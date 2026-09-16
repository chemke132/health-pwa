/**
 * Bypass ("빠른 기록") presets. Tapping a chip inserts these hardcoded values
 * straight into Supabase — NO Gemini call — to save API cost on frequent meals.
 * Edit / add your own favorites here.
 */
export const FAVORITE_MEALS = [
  { label: '단백질 쉐이크 2스쿱', food_name: '단백질 쉐이크 2스쿱', calories: 240, protein: 48, carbs: 6, fat: 3 },
  { label: '닭가슴살 100g + 고구마', food_name: '닭가슴살 100g + 고구마 150g', calories: 300, protein: 31, carbs: 32, fat: 4 },
  { label: '삶은 계란 3개', food_name: '삶은 계란 3개', calories: 234, protein: 19, carbs: 2, fat: 16 },
  { label: '바나나 1개', food_name: '바나나 1개', calories: 105, protein: 1, carbs: 27, fat: 0 },
  { label: '아메리카노', food_name: '아메리카노 (블랙)', calories: 10, protein: 0, carbs: 2, fat: 0 },
];
