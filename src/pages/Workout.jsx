import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, selectWorkoutsForDate } from '../store/useAppStore';
import Card from '../components/Card';
import Fab from '../components/Fab';
import Modal from '../components/Modal';
import { Field, TextInput, FormActions } from '../components/Field';
import { recognizeText } from '../lib/ocr';
import { parseWorkoutText, estimateWorkout } from '../lib/ai';
import ExerciseEditor from '../components/ExerciseEditor';
import {
  emptyExercise,
  cleanExercises,
  computeVolume,
  summarizeExercises,
} from '../lib/strength';

const EMPTY = { workout_desc: '', burned_calories: '', duration_mins: '' };

export default function Workout() {
  const { t } = useTranslation();
  const workouts = useAppStore(selectWorkoutsForDate);
  const addWorkout = useAppStore((s) => s.addWorkout);
  const removeRow = useAppStore((s) => s.removeRow);
  const profile = useAppStore((s) => s.appData.profile);

  const fileRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [nlText, setNlText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [exercises, setExercises] = useState([emptyExercise()]);
  const [aiFilled, setAiFilled] = useState(false);
  const [phase, setPhase] = useState(null); // 'ocr' | 'ai' | null
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const num = (v) => (v === '' ? 0 : Number(v));

  const resetForm = () => {
    setForm(EMPTY);
    setExercises([emptyExercise()]);
    setNlText('');
    setAiFilled(false);
    setError(null);
    setPhase(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // Natural language → personalized calorie estimate (uses body stats).
  const analyze = async () => {
    if (!nlText.trim()) return;
    setAnalyzing(true);
    setError(null);
    try {
      const r = await estimateWorkout(nlText.trim(), profile);
      setForm({
        workout_desc: r.workout_desc,
        burned_calories: String(r.burned_calories),
        duration_mins: String(r.duration_mins),
      });
      setAiFilled(true);
    } catch (err) {
      setError(t('form.aiError') + ' ' + (err.message ?? ''));
    } finally {
      setAnalyzing(false);
    }
  };

  // Hybrid: Tesseract OCR (frontend worker) → Gemini → structured fields.
  const onImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      setPhase('ocr');
      const rawText = await recognizeText(file);

      setPhase('ai');
      const r = await parseWorkoutText(rawText);

      setForm({
        workout_desc: r.workout_desc,
        burned_calories: String(r.burned_calories),
        duration_mins: String(r.duration_mins),
      });
      setAiFilled(true);
    } catch (err) {
      setError(t('form.aiError') + ' ' + (err.message ?? ''));
    } finally {
      setPhase(null);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const cleaned = cleanExercises(exercises);
    const desc = form.workout_desc.trim() || summarizeExercises(cleaned);
    // need either a description or at least one logged exercise
    if (!desc && !cleaned.length) return;
    setSaving(true);
    setError(null);
    try {
      await addWorkout({
        workout_desc: desc || '운동',
        burned_calories: num(form.burned_calories),
        duration_mins: num(form.duration_mins),
        exercises: cleaned,
        volume: computeVolume(cleaned),
        source: aiFilled ? 'ocr' : 'manual',
      });
      resetForm();
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl md:text-2xl font-black">{t('workout.title')}</h1>

      {workouts.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-400">{t('workout.empty')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {workouts.map((w) => (
            <Card key={w.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 dark:text-slate-100">
                    {w.workout_desc}
                  </p>
                  {Array.isArray(w.exercises) && w.exercises.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {w.exercises.map((ex, i) => (
                        <li key={i} className="text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold">{ex.name}</span>{' '}
                          {(ex.sets || [])
                            .map((s) => `${s.weight}×${s.reps}`)
                            .join(', ')}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    {t('workout.duration')}: {w.duration_mins ?? 0} {t('workout.mins')}
                    {w.volume > 0 && ` · ${t('form.volume')} ${w.volume}kg`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-lg font-black tabular-nums text-emerald-600 whitespace-nowrap">
                    −{w.burned_calories ?? 0}
                    <span className="ml-1 text-xs font-medium text-slate-400">
                      {t('meal.kcal')}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow('workouts', w.id)}
                    className="text-xs text-slate-300 hover:text-red-500"
                  >
                    {t('form.delete')}
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Fab onClick={() => { resetForm(); setOpen(true); }} label={t('form.addWorkout')} />

      <Modal open={open} onClose={() => setOpen(false)} title={t('form.addWorkout')}>
        <div className="space-y-4">
          {/* Natural language → personalized AI estimate */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('form.workoutNlLabel')}
            </span>
            <textarea
              rows={2}
              value={nlText}
              onChange={(e) => setNlText(e.target.value)}
              placeholder={t('form.workoutNlPlaceholder')}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand resize-none"
            />
            <button
              type="button"
              onClick={analyze}
              disabled={analyzing || !nlText.trim()}
              className="w-full rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-2.5 text-sm font-bold disabled:opacity-50"
            >
              {analyzing ? t('form.analyzing') : t('form.analyze')}
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-300">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            {t('form.screenshotSection')}
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* Screenshot → OCR → AI */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('form.screenshotSection')}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onImage}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={phase !== null}
              className="w-full rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-2.5 text-sm font-bold disabled:opacity-50"
            >
              {phase === 'ocr'
                ? t('form.ocrRunning')
                : phase === 'ai'
                ? t('form.aiParsing')
                : t('form.pickImage')}
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-300">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            {t('form.manualSection')}
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* Editable fields */}
          <form onSubmit={submit} className="space-y-3">
            {aiFilled && (
              <p className="text-xs text-emerald-600">{t('form.aiFilled')}</p>
            )}
            <Field label={t('form.workoutDesc')}>
              <TextInput value={form.workout_desc} onChange={set('workout_desc')} />
            </Field>

            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t('form.exercises')}
              </span>
              <div className="mt-2">
                <ExerciseEditor value={exercises} onChange={setExercises} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t('form.burned')}>
                <TextInput type="number" inputMode="numeric" value={form.burned_calories} onChange={set('burned_calories')} />
              </Field>
              <Field label={t('form.duration')}>
                <TextInput type="number" inputMode="numeric" value={form.duration_mins} onChange={set('duration_mins')} />
              </Field>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <FormActions
              onCancel={() => setOpen(false)}
              saving={saving}
              cancelLabel={t('form.cancel')}
              saveLabel={t('form.save')}
            />
          </form>
        </div>
      </Modal>
    </div>
  );
}
