/**
 * Bypass ("빠른 기록") presets. Tapping a chip inserts these hardcoded values
 * straight into Supabase — NO Gemini call — to save API cost on frequent meals.
 * `label`/`labelEn` are the chip text per language; `food_name` is what's stored
 * (translated for display like any other meal). Edit / add your own here.
 */
export const FAVORITE_MEALS = [
  { label: '단백질 쉐이크 2스쿱', labelEn: 'Protein shake (2 scoops)', food_name: '단백질 쉐이크 2스쿱', calories: 240, protein: 48, carbs: 6, fat: 3 },
  { label: '닭가슴살 100g + 고구마', labelEn: 'Chicken breast 100g + sweet potato', food_name: '닭가슴살 100g + 고구마 150g', calories: 300, protein: 31, carbs: 32, fat: 4 },
  { label: '삶은 계란 3개', labelEn: '3 boiled eggs', food_name: '삶은 계란 3개', calories: 234, protein: 19, carbs: 2, fat: 16 },
  { label: '바나나 1개', labelEn: '1 banana', food_name: '바나나 1개', calories: 105, protein: 1, carbs: 27, fat: 0 },
  { label: '아메리카노', labelEn: 'Americano (black)', food_name: '아메리카노 (블랙)', calories: 10, protein: 0, carbs: 2, fat: 0 },
];
