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
import StrengthCharts from '../components/StrengthCharts';
import {
  emptyExercise,
  cleanExercises,
  computeVolume,
  summarizeExercises,
  exercisesToText,
} from '../lib/strength';
import { toKg, toDisplayWeight, weightUnitLabel, LB_PER_KG } from '../lib/units';

const EMPTY = { workout_desc: '', burned_calories: '', duration_mins: '' };

const isStrength = (w) =>
  w.workout_type === 'strength' || (Array.isArray(w.exercises) && w.exercises.length > 0);

function WorkoutCard({ w, onDelete }) {
  const { t } = useTranslation();
  const system = useAppStore((s) => s.unitSystem);
  const wl = weightUnitLabel(system);
  // stored weights/volume are kg → show in the current unit
  const dispVol = system === 'imperial' ? Math.round((w.volume || 0) * LB_PER_KG) : w.volume;
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-slate-800 dark:text-slate-100">{w.workout_desc}</p>
          {Array.isArray(w.exercises) && w.exercises.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {w.exercises.map((ex, i) => (
                <li key={i} className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold">{ex.name}</span>{' '}
                  {(ex.sets || [])
                    .map((s) => `${toDisplayWeight(s.weight, system)}×${s.reps}`)
                    .join(', ')}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-slate-400 mt-1">
            {t('workout.duration')}: {w.duration_mins ?? 0} {t('workout.mins')}
            {w.volume > 0 && ` · ${t('form.volume')} ${dispVol}${wl}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-lg font-black tabular-nums text-emerald-600 whitespace-nowrap">
            −{w.burned_calories ?? 0}
            <span className="ml-1 text-xs font-medium text-slate-400">{t('meal.kcal')}</span>
          </span>
          <button
            type="button"
            onClick={() => onDelete(w.id)}
            className="text-xs text-slate-300 hover:text-red-500"
          >
            {t('form.delete')}
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function Workout() {
  const { t } = useTranslation();
  const workouts = useAppStore(selectWorkoutsForDate);
  const addWorkout = useAppStore((s) => s.addWorkout);
  const removeRow = useAppStore((s) => s.removeRow);
  const profile = useAppStore((s) => s.appData.profile);
  const allWorkouts = useAppStore((s) => s.appData.workouts);
  const system = useAppStore((s) => s.unitSystem);

  // exercises are edited in the display unit → convert weights to kg for storage/AI
  const toKgExercises = (exs) =>
    cleanExercises(exs).map((ex) => ({
      name: ex.name,
      sets: ex.sets.map((s) => ({
        weight: Math.round((toKg(s.weight, system) ?? 0) * 10) / 10,
        reps: s.reps,
      })),
    }));

  const strengthList = workouts.filter(isStrength);
  const cardioList = workouts.filter((w) => !isStrength(w));

  const fileRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('strength'); // 'strength' | 'cardio'
  const [form, setForm] = useState(EMPTY);
  const [exercises, setExercises] = useState([emptyExercise()]);
  const [nlText, setNlText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [estimating, setEstimating] = useState(false);
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

  const openModal = (t0) => {
    resetForm();
    setType(t0);
    setOpen(true);
  };

  // Cardio: natural language → personalized calorie estimate
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

  // Strength: estimate calories from the logged exercises + duration
  const estimateStrengthCalories = async () => {
    // build text from kg-converted sets so the AI reads real kg values
    const text = exercisesToText(toKgExercises(exercises));
    if (!text) return;
    setEstimating(true);
    setError(null);
    try {
      const dur = form.duration_mins ? `, ${form.duration_mins} min` : '';
      const r = await estimateWorkout(`Weight training: ${text}${dur}`, profile);
      setForm((f) => ({
        ...f,
        burned_calories: String(r.burned_calories),
        duration_mins: f.duration_mins || String(r.duration_mins),
      }));
    } catch (err) {
      setError(t('form.aiError') + ' ' + (err.message ?? ''));
    } finally {
      setEstimating(false);
    }
  };

  // Cardio: Tesseract OCR → Gemini
  const onImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      setPhase('ocr');
      const rawText = await recognizeText(file);
      setPhase('ai');
      const r = await parseWorkoutText(rawText);
      // Keep a description the user already typed (a screenshot doesn't say
      // what the workout was); only fill it when it's still empty.
      setForm((f) => ({
        workout_desc: f.workout_desc.trim() || r.workout_desc,
        burned_calories: String(r.burned_calories),
        duration_mins: String(r.duration_mins),
      }));
      setAiFilled(true);
    } catch (err) {
      setError(t('form.aiError') + ' ' + (err.message ?? ''));
    } finally {
      setPhase(null);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    let payload;
    if (type === 'strength') {
      const cleaned = toKgExercises(exercises); // weights in kg (canonical)
      const desc = form.workout_desc.trim() || summarizeExercises(cleaned);
      if (!desc && !cleaned.length) return;
      payload = {
        workout_type: 'strength',
        workout_desc: desc || t('workout.strength'),
        burned_calories: num(form.burned_calories),
        duration_mins: num(form.duration_mins),
        exercises: cleaned,
        volume: computeVolume(cleaned),
        source: 'manual',
      };
    } else {
      if (!form.workout_desc.trim()) return;
      payload = {
        workout_type: 'cardio',
        workout_desc: form.workout_desc.trim(),
        burned_calories: num(form.burned_calories),
        duration_mins: num(form.duration_mins),
        exercises: [],
        volume: 0,
        source: aiFilled ? 'ocr' : 'manual',
      };
    }

    setSaving(true);
    try {
      await addWorkout(payload);
      resetForm();
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const section = (titleKey, list, emptyTypeLabel) => (
    <div className="space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {t(titleKey)}
      </h2>
      {list.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-400">{t('workout.empty')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {list.map((w) => (
            <WorkoutCard key={w.id} w={w} onDelete={(id) => removeRow('workouts', id)} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-black">{t('workout.title')}</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => openModal('strength')}
            className="rounded-xl bg-brand px-3 py-1.5 text-sm font-bold text-white shadow shadow-brand/30"
          >
            + {t('workout.strength')}
          </button>
          <button
            type="button"
            onClick={() => openModal('cardio')}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-bold text-slate-600 dark:text-slate-300"
          >
            + {t('workout.cardio')}
          </button>
        </div>
      </div>

      {section('workout.strength', strengthList)}
      {section('workout.cardio', cardioList)}

      <StrengthCharts workouts={allWorkouts} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={type === 'strength' ? t('workout.strength') : t('workout.cardio')}
      >
        {/* type switch inside the modal */}
        <div className="mb-4 inline-flex w-full rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
          {['strength', 'cardio'].map((ty) => (
            <button
              key={ty}
              type="button"
              onClick={() => setType(ty)}
              className={`flex-1 rounded-lg py-2 text-sm font-bold transition-colors ${
                type === ty
                  ? 'bg-white dark:bg-slate-900 text-brand-fg dark:text-brand shadow'
                  : 'text-slate-500'
              }`}
            >
              {t(`workout.${ty}`)}
            </button>
          ))}
        </div>

        {type === 'cardio' ? (
          <div className="space-y-4">
            {/* Natural language → AI estimate */}
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
            <input ref={fileRef} type="file" accept="image/*" onChange={onImage} className="hidden" />
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

            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              {t('form.manualSection')}
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            <form onSubmit={submit} className="space-y-3">
              {aiFilled && <p className="text-xs text-emerald-600">{t('form.aiFilled')}</p>}
              <Field label={t('form.workoutDesc')}>
                <TextInput value={form.workout_desc} onChange={set('workout_desc')} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('form.burned')}>
                  <TextInput type="number" inputMode="numeric" value={form.burned_calories} onChange={set('burned_calories')} />
                </Field>
                <Field label={t('form.duration')}>
                  <TextInput type="number" inputMode="numeric" value={form.duration_mins} onChange={set('duration_mins')} />
                </Field>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <FormActions onCancel={() => setOpen(false)} saving={saving} cancelLabel={t('form.cancel')} saveLabel={t('form.save')} />
            </form>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Field label={t('form.workoutDesc')}>
              <TextInput value={form.workout_desc} onChange={set('workout_desc')} placeholder={t('form.exerciseName')} />
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

            <button
              type="button"
              onClick={estimateStrengthCalories}
              disabled={estimating}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-50"
            >
              {estimating ? t('form.estimating') : t('form.estimateCalories')}
            </button>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <FormActions onCancel={() => setOpen(false)} saving={saving} cancelLabel={t('form.cancel')} saveLabel={t('form.save')} />
          </form>
        )}
      </Modal>

      <Fab onClick={() => openModal('strength')} label={t('form.addWorkout')} />
    </div>
  );
}
