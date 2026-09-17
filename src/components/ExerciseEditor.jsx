import { useTranslation } from 'react-i18next';
import { emptySet, emptyExercise, computeVolume, best1RM } from '../lib/strength';
import { useAppStore } from '../store/useAppStore';
import { weightUnitLabel } from '../lib/units';

/**
 * Structured strength entry: a list of exercises, each with per-set weight × reps.
 * Weights are typed in the current unit (kg/lb); the parent converts to kg on save.
 * `value` is the exercises array; `onChange` receives the updated array.
 */
export default function ExerciseEditor({ value, onChange }) {
  const { t } = useTranslation();
  const wl = weightUnitLabel(useAppStore((s) => s.unitSystem));
  const exercises = value.length ? value : [emptyExercise()];

  const update = (next) => onChange(next);

  const setExercise = (i, patch) =>
    update(exercises.map((ex, idx) => (idx === i ? { ...ex, ...patch } : ex)));

  const setSet = (ei, si, patch) =>
    setExercise(ei, {
      sets: exercises[ei].sets.map((s, idx) => (idx === si ? { ...s, ...patch } : s)),
    });

  const addExercise = () => update([...exercises, emptyExercise()]);
  const removeExercise = (i) => update(exercises.filter((_, idx) => idx !== i));

  const addSet = (ei) => {
    const last = exercises[ei].sets[exercises[ei].sets.length - 1] || emptySet();
    // pre-fill with the previous set for convenience
    setExercise(ei, { sets: [...exercises[ei].sets, { ...last }] });
  };
  const removeSet = (ei, si) =>
    setExercise(ei, { sets: exercises[ei].sets.filter((_, idx) => idx !== si) });

  const inputCls =
    'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm text-center text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand';

  return (
    <div className="space-y-3">
      {exercises.map((ex, ei) => {
        const oneRm = best1RM(ex.sets);
        return (
          <div
            key={ei}
            className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2"
          >
            <div className="flex items-center gap-2">
              <input
                value={ex.name}
                onChange={(e) => setExercise(ei, { name: e.target.value })}
                placeholder={t('form.exerciseName')}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand"
              />
              {exercises.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeExercise(ei)}
                  className="shrink-0 text-slate-300 hover:text-red-500 text-sm px-1"
                  aria-label="remove exercise"
                >
                  ✕
                </button>
              )}
            </div>

            {/* set rows */}
            <div className="space-y-1.5">
              {ex.sets.map((s, si) => (
                <div key={si} className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-xs font-semibold text-slate-400">
                    {t('form.setN', { n: si + 1 })}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={s.weight}
                    onChange={(e) => setSet(ei, si, { weight: e.target.value })}
                    placeholder={`${t('form.weightShort')}(${wl})`}
                    className={inputCls}
                  />
                  <span className="text-slate-300 text-xs">×</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={s.reps}
                    onChange={(e) => setSet(ei, si, { reps: e.target.value })}
                    placeholder={t('form.reps')}
                    className={inputCls}
                  />
                  {ex.sets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSet(ei, si)}
                      className="shrink-0 text-slate-300 hover:text-red-500 text-xs px-1"
                      aria-label="remove set"
                    >
                      −
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <button
                type="button"
                onClick={() => addSet(ei)}
                className="text-xs font-semibold text-brand-fg dark:text-brand"
              >
                {t('form.addSet')}
              </button>
              {oneRm > 0 && (
                <span className="text-xs text-slate-400">
                  {t('form.estimated1rm')} ≈ {oneRm}
                  {wl}
                </span>
              )}
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addExercise}
          className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-500 dark:text-slate-300"
        >
          {t('form.addExercise')}
        </button>
        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
          {t('form.volume')}: {computeVolume(exercises)} {wl}
        </span>
      </div>
    </div>
  );
}
