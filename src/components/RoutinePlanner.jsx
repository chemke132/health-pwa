import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import ExerciseEditor from './ExerciseEditor';
import { emptyExercise, cleanExercises, summarizeExercises } from '../lib/strength';
import { toKg, toDisplayWeight } from '../lib/units';

/**
 * Plan/manage reusable routines (the full plan: exercises, sets, weights).
 * Logging a session is elsewhere — here you just build templates.
 */
export default function RoutinePlanner() {
  const { t } = useTranslation();
  const routines = useAppStore((s) => s.appData.routines);
  const addRoutine = useAppStore((s) => s.addRoutine);
  const editRoutineStore = useAppStore((s) => s.editRoutine);
  const removeRoutine = useAppStore((s) => s.removeRoutine);
  const system = useAppStore((s) => s.unitSystem);

  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState([emptyExercise()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const toKgEx = (exs) =>
    cleanExercises(exs).map((ex) => ({
      name: ex.name,
      sets: ex.sets.map((s) => ({
        weight: Math.round((toKg(s.weight, system) ?? 0) * 10) / 10,
        reps: s.reps,
      })),
    }));

  const fromKgEx = (exs) =>
    (exs && exs.length ? exs : [emptyExercise()]).map((ex) => ({
      name: ex.name || '',
      sets: (ex.sets && ex.sets.length ? ex.sets : [{ weight: '', reps: '' }]).map((s) => ({
        weight: s.weight ? toDisplayWeight(s.weight, system) : '',
        reps: s.reps ?? '',
      })),
    }));

  const resetEditor = () => {
    setEditingId(null);
    setName('');
    setExercises([emptyExercise()]);
    setError(null);
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setName(r.name);
    setExercises(fromKgEx(r.exercises));
    setError(null);
  };

  const save = async () => {
    const kg = toKgEx(exercises);
    if (!kg.length) return;
    const nm = name.trim() || summarizeExercises(kg);
    setSaving(true);
    setError(null);
    try {
      if (editingId) await editRoutineStore(editingId, nm, kg);
      else await addRoutine(nm, kg);
      resetEditor();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* existing routines */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {t('form.savedRoutines')}
        </span>
        {routines.length === 0 ? (
          <p className="text-sm text-slate-400">{t('form.noRoutinesYet')}</p>
        ) : (
          <div className="space-y-2">
            {routines.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                    {r.name}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {(r.exercises || []).map((e) => e.name).filter(Boolean).join(', ')}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(r)}
                    className="text-xs font-semibold text-brand-fg dark:text-brand"
                  >
                    {t('form.edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRoutine(r.id)}
                    className="text-xs text-slate-300 hover:text-red-500"
                  >
                    {t('form.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-slate-200 dark:bg-slate-700" />

      {/* editor */}
      <div className="space-y-3">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {editingId ? t('form.editRoutine') : t('form.newRoutine')}
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('form.routineNamePlaceholder')}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand"
        />
        <ExerciseEditor value={exercises} onChange={setExercises} showInclude={false} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          {editingId && (
            <button
              type="button"
              onClick={resetEditor}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold text-slate-500"
            >
              {t('form.newRoutine')}
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-bold text-white shadow shadow-brand/30 disabled:opacity-50"
          >
            {t('form.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
