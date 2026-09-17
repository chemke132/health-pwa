import { useTranslation } from 'react-i18next';
import { emptySet, emptyExercise, computeVolume, best1RM } from '../lib/strength';
import { useAppStore } from '../store/useAppStore';
import { liftLabel, liftToKg, kgToLift } from '../lib/units';

/**
 * Structured strength entry: a list of exercises, each with per-set weight × reps.
 * Weights are typed in the lifting unit (kg/lb, its own toggle here), and the
 * parent converts to kg on save. `value` is the exercises array; `onChange`
 * receives the updated array.
 */
export default function ExerciseEditor({ value, onChange, showInclude = true }) {
  const { t } = useTranslation();
  const liftUnit = useAppStore((s) => s.liftUnit);
  const setLiftUnit = useAppStore((s) => s.setLiftUnit);
  const wl = liftLabel(liftUnit);
  const exercises = value.length ? value : [emptyExercise()];

  // Switch the lifting unit and convert the values already entered.
  const changeUnit = (u) => {
    if (u === liftUnit) return;
    onChange(
      exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) =>
          s.weight === '' || s.weight == null
            ? s
            : { ...s, weight: kgToLift(liftToKg(s.weight, liftUnit), u) }
        ),
      }))
    );
    setLiftUnit(u);
  };

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
      <div className="flex justify-end">
        <div className="inline-flex items-center rounded-full bg-slate-200/70 dark:bg-slate-700/70 p-0.5 text-xs font-semibold">
          {['kg', 'lb'].map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => changeUnit(u)}
              aria-pressed={liftUnit === u}
              className={`px-3 py-1 rounded-full transition-colors ${
                liftUnit === u
                  ? 'bg-white dark:bg-slate-900 text-brand-fg dark:text-brand shadow'
                  : 'text-slate-500 dark:text-slate-300'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {exercises.map((ex, ei) => {
        const oneRm = best1RM(ex.sets);
        const included = ex.include !== false;
        return (
          <div
            key={ei}
            className={`rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2 ${
              included ? '' : 'opacity-50'
            }`}
          >
            <div className="flex items-center gap-2">
              {showInclude && (
                <input
                  type="checkbox"
                  checked={included}
                  onChange={() => setExercise(ei, { include: !included })}
                  aria-label="include exercise"
                  className="h-4 w-4 shrink-0 accent-[#0ea5e9]"
                />
              )}
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
          {t('form.volume')}: {computeVolume(exercises.filter((e) => e.include !== false))} {wl}
        </span>
      </div>
    </div>
  );
}
