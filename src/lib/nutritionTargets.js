/**
 * Daily nutrition targets from the user's BMR + weight and their goal mode.
 *   maintenance ≈ BMR × 1.4 (light activity; workouts are logged separately)
 *   diet  = maintenance − 500 kcal    (≈ 0.5 kg/week loss)
 *   bulk  = maintenance + 300 kcal    (lean gain)
 * Macros: protein by g/kg bodyweight, fat ≈ 25% of calories, carbs = remainder.
 */
export const DIET_MODES = ['maintain', 'diet', 'bulk'];

const ACTIVITY = 1.4;

export function computeTargets(profile, mode = 'maintain') {
  const bmr = Number(profile?.bmr) || 0;
  const weight = Number(profile?.current_weight) || 0;
  if (!bmr) return null; // need a BMR to compute anything

  const maintenance = Math.round(bmr * ACTIVITY);
  let calories = maintenance;
  if (mode === 'diet') calories = maintenance - 500;
  if (mode === 'bulk') calories = maintenance + 300;
  calories = Math.max(1000, calories);

  const proteinPerKg = mode === 'diet' ? 2.0 : mode === 'bulk' ? 1.8 : 1.6;
  const protein = weight
    ? Math.round(weight * proteinPerKg)
    : Math.round((calories * 0.3) / 4);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

  return { calories, protein, carbs, fat, maintenance };
}
