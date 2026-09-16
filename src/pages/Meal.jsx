import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, selectMealsForDate } from '../store/useAppStore';
import Card from '../components/Card';
import Fab from '../components/Fab';
import Modal from '../components/Modal';
import { Field, TextInput, FormActions } from '../components/Field';
import { parseMealText } from '../lib/ai';
import { FAVORITE_MEALS } from '../lib/favoriteMeals';

const EMPTY = { food_name: '', calories: '', protein: '', carbs: '', fat: '' };

export default function Meal() {
  const { t } = useTranslation();
  const meals = useAppStore(selectMealsForDate);
  const addMeal = useAppStore((s) => s.addMeal);
  const removeRow = useAppStore((s) => s.removeRow);

  const [open, setOpen] = useState(false);
  const [nlText, setNlText] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [aiFilled, setAiFilled] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [chipBusy, setChipBusy] = useState(null);
  const [error, setError] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const num = (v) => (v === '' ? 0 : Number(v));

  const resetForm = () => {
    setForm(EMPTY);
    setNlText('');
    setAiFilled(false);
    setError(null);
  };

  // Bypass: hardcoded favorite → straight to Supabase, NO Gemini call.
  const quickAdd = async (fav) => {
    setChipBusy(fav.label);
    setError(null);
    try {
      await addMeal({
        food_name: fav.food_name,
        calories: fav.calories,
        protein: fav.protein,
        carbs: fav.carbs,
        fat: fav.fat,
        input_type: 'favorite',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setChipBusy(null);
    }
  };

  // Natural language → Gemini → fill the editable fields.
  const analyze = async () => {
    if (!nlText.trim()) return;
    setAnalyzing(true);
    setError(null);
    try {
      const r = await parseMealText(nlText.trim());
      setForm({
        food_name: r.food_name,
        calories: String(r.calories),
        protein: String(r.protein),
        carbs: String(r.carbs),
        fat: String(r.fat),
      });
      setAiFilled(true);
    } catch (err) {
      setError(t('form.aiError') + ' ' + (err.message ?? ''));
    } finally {
      setAnalyzing(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.food_name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await addMeal({
        food_name: form.food_name.trim(),
        calories: num(form.calories),
        protein: num(form.protein),
        carbs: num(form.carbs),
        fat: num(form.fat),
        input_type: aiFilled ? 'ai' : 'manual',
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
      <h1 className="text-xl md:text-2xl font-black">{t('meal.title')}</h1>

      {/* Bypass chips */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
          {t('form.favorites')}
        </p>
        <div className="flex flex-wrap gap-2">
          {FAVORITE_MEALS.map((fav) => (
            <button
              key={fav.label}
              type="button"
              onClick={() => quickAdd(fav)}
              disabled={chipBusy === fav.label}
              className="rounded-full border border-brand/40 bg-brand/10 text-brand-fg dark:text-brand px-3 py-1.5 text-sm font-semibold hover:bg-brand/20 disabled:opacity-50 transition"
            >
              {chipBusy === fav.label ? '…' : `+ ${fav.label}`}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {meals.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-400">{t('meal.empty')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {meals.map((m) => (
            <Card key={m.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-100">
                    {m.food_name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 space-x-2">
                    <span>{t('meal.protein')} {m.protein ?? 0}g</span>
                    <span>{t('meal.carbs')} {m.carbs ?? 0}g</span>
                    <span>{t('meal.fat')} {m.fat ?? 0}g</span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-lg font-black tabular-nums text-brand-fg dark:text-brand whitespace-nowrap">
                    {m.calories ?? 0}
                    <span className="ml-1 text-xs font-medium text-slate-400">
                      {t('meal.kcal')}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow('meals', m.id)}
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

      <Fab onClick={() => { resetForm(); setOpen(true); }} label={t('form.addMeal')} />

      <Modal open={open} onClose={() => setOpen(false)} title={t('form.addMeal')}>
        <div className="space-y-4">
          {/* Natural language → AI */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('form.nlLabel')}
            </span>
            <textarea
              rows={2}
              value={nlText}
              onChange={(e) => setNlText(e.target.value)}
              placeholder={t('form.nlPlaceholder')}
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
            {t('form.manualSection')}
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* Editable fields (AI-filled or manual) */}
          <form onSubmit={submit} className="space-y-3">
            {aiFilled && (
              <p className="text-xs text-emerald-600">{t('form.aiFilled')}</p>
            )}
            <Field label={t('form.foodName')}>
              <TextInput value={form.food_name} onChange={set('food_name')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('form.calories')}>
                <TextInput type="number" inputMode="numeric" value={form.calories} onChange={set('calories')} />
              </Field>
              <Field label={t('form.protein')}>
                <TextInput type="number" inputMode="numeric" value={form.protein} onChange={set('protein')} />
              </Field>
              <Field label={t('form.carbs')}>
                <TextInput type="number" inputMode="numeric" value={form.carbs} onChange={set('carbs')} />
              </Field>
              <Field label={t('form.fat')}>
                <TextInput type="number" inputMode="numeric" value={form.fat} onChange={set('fat')} />
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
