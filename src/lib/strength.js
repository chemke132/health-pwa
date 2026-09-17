/**
 * Structured strength data lives on `workouts.exercises` (jsonb):
 *   [{ name: string, sets: [{ weight: number, reps: number }, ...] }, ...]
 *
 * Volume (training volume) = Σ weight × reps over all sets — the standard proxy
 * for hypertrophy stimulus. Estimated 1RM uses the Epley formula.
 */

export const emptySet = () => ({ weight: '', reps: '' });
export const emptyExercise = () => ({ name: '', sets: [emptySet()] });

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Total training volume (kg) for a workout's exercises. */
export function computeVolume(exercises) {
  if (!Array.isArray(exercises)) return 0;
  let total = 0;
  for (const ex of exercises) {
    for (const s of ex.sets || []) {
      total += num(s.weight) * num(s.reps);
    }
  }
  return Math.round(total);
}

/** Epley estimated 1RM for a single set. */
export function estimate1RM(weight, reps) {
  const w = num(weight);
  const r = num(reps);
  if (!w || !r) return 0;
  return Math.round(w * (1 + r / 30));
}

/** Best (highest) estimated 1RM across an exercise's sets. */
export function best1RM(sets) {
  let best = 0;
  for (const s of sets || []) {
    best = Math.max(best, estimate1RM(s.weight, s.reps));
  }
  return best;
}

/** Distinct exercise names present in a list of workouts (for 1RM chart picker). */
export function exerciseNames(workouts) {
  const set = new Set();
  for (const w of workouts) {
    for (const ex of w.exercises || []) {
      if (ex.name?.trim()) set.add(ex.name.trim());
    }
  }
  return [...set];
}

/** Auto title from exercises, e.g. "벤치프레스 외 2종목". */
export function summarizeExercises(exercises) {
  const named = (exercises || []).map((e) => e.name?.trim()).filter(Boolean);
  if (!named.length) return '';
  if (named.length === 1) return named[0];
  return `${named[0]} 외 ${named.length - 1}종목`;
}

/** Flatten exercises into a text summary for the AI calorie estimator. */
export function exercisesToText(exercises) {
  return (exercises || [])
    .map((e) => {
      const name = e.name?.trim();
      const sets = (e.sets || [])
        .filter((s) => num(s.weight) > 0 || num(s.reps) > 0)
        .map((s) => `${num(s.weight)}kg x ${num(s.reps)}`)
        .join(', ');
      if (!name && !sets) return null;
      if (!name) return sets; // sets logged without a name still count
      return sets ? `${name} (${sets})` : name;
    })
    .filter(Boolean)
    .join('; ');
}

/** Strip empty sets/exercises before saving. */
export function cleanExercises(exercises) {
  return (exercises || [])
    .map((ex) => ({
      name: ex.name?.trim() || '',
      sets: (ex.sets || [])
        .filter((s) => num(s.weight) > 0 || num(s.reps) > 0)
        .map((s) => ({ weight: num(s.weight), reps: num(s.reps) })),
    }))
    .filter((ex) => ex.name || ex.sets.length);
}
