/**
 * Weight is ALWAYS stored in kilograms in the DB (canonical unit). The user's
 * chosen display unit (kg | lb) only affects what's shown and what they type.
 */
export const LB_PER_KG = 2.2046226218;

const round1 = (n) => Math.round(n * 10) / 10;

/** kg (from DB) → number in the display unit, rounded to 1 decimal. */
export function toDisplayWeight(kg, unit) {
  if (kg == null || kg === '') return null;
  const n = Number(kg);
  return unit === 'lb' ? round1(n * LB_PER_KG) : round1(n);
}

/** A value the user typed in the display unit → kg for storage. */
export function toKg(value, unit) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return unit === 'lb' ? n / LB_PER_KG : n;
}

export function unitLabel(unit) {
  return unit === 'lb' ? 'lb' : 'kg';
}
