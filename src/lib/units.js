/**
 * One "unit system" drives both weight and height display:
 *   - 'metric'   → kg + cm
 *   - 'imperial' → lb + ft/in  (US)
 *
 * The DB always stores canonical units: weight in KILOGRAMS, height in
 * CENTIMETERS. Only display and user input convert.
 */
export const LB_PER_KG = 2.2046226218;
export const CM_PER_IN = 2.54;

const round1 = (n) => Math.round(n * 10) / 10;

export const weightUnitLabel = (system) => (system === 'imperial' ? 'lb' : 'kg');
export const heightUnitLabel = (system) => (system === 'imperial' ? 'ft' : 'cm');

/* ------------------------------- weight -------------------------------- */

/** kg (from DB) → number in the system's weight unit, 1 decimal. */
export function toDisplayWeight(kg, system) {
  if (kg == null || kg === '') return null;
  const n = Number(kg);
  return system === 'imperial' ? round1(n * LB_PER_KG) : round1(n);
}

/** A value typed in the system's weight unit → kg for storage. */
export function toKg(value, system) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return system === 'imperial' ? n / LB_PER_KG : n;
}

/* ------------------------------- height -------------------------------- */

/** cm → { ft, in } (inches rounded, carrying to feet at 12). */
export function cmToFtIn(cm) {
  if (cm == null || cm === '') return { ft: '', in: '' };
  const totalIn = Number(cm) / CM_PER_IN;
  let ft = Math.floor(totalIn / 12);
  let inch = Math.round(totalIn - ft * 12);
  if (inch === 12) {
    ft += 1;
    inch = 0;
  }
  return { ft, in: inch };
}

/** feet + inches → cm for storage. */
export function ftInToCm(ft, inch) {
  const f = Number(ft) || 0;
  const i = Number(inch) || 0;
  if (!f && !i) return null;
  return (f * 12 + i) * CM_PER_IN;
}

/** Human-readable height string, e.g. "175 cm" or "5'9\"". */
export function formatHeight(cm, system) {
  if (cm == null || cm === '') return null;
  if (system === 'imperial') {
    const { ft, in: inch } = cmToFtIn(cm);
    return `${ft}'${inch}"`;
  }
  return `${Math.round(Number(cm))} cm`;
}
