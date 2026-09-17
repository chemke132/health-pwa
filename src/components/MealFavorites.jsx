import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { Field, TextInput } from './Field';
import { parseMealText } from '../lib/ai';

const EMPTY = { food_name: '', calories: '', protein: '', carbs: '', fat: '' };

/** Manage user-defined favorite meals (quick-add presets). */
export default function MealFavorites() {
  const { t } = useTranslation();
  const favorites = useAppStore((s) => s.appData.mealFavorites);
  const addMealFavorite = useAppStore((s) => s.addMealFavorite);
  const removeMealFavorite = useAppStore((s) => s.removeMealFavorite);

  const [form, setForm] = useState(EMPTY);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const num = (v) => (v === '' ? 0 : Number(v));

  const analyze = async () => {
    if (!form.food_name.trim()) return;
    setAnalyzing(true);
    setError(null);
    try {
      const r = await parseMealText(form.food_name.trim());
      setForm((f) => ({
        ...f,
        food_name: r.food_name,
        calories: String(r.calories),
        protein: String(r.protein),
        carbs: String(r.carbs),
        fat: String(r.fat),
      }));
    } catch (err) {
      setError(t('form.aiError') + ' ' + (err.message ?? ''));
    } finally {
      setAnalyzing(false);
    }
  };

  const save = async () => {
    if (!form.food_name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await addMealFavorite({
        food_name: form.food_name.trim(),
        calories: num(form.calories),
        protein: num(form.protein),
        carbs: num(form.carbs),
        fat: num(form.fat),
      });
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {t('form.favorites')}
        </span>
        {favorites.length === 0 ? (
          <p className="text-sm text-slate-400">{t('form.noFavorites')}</p>
        ) : (
          <div className="space-y-2">
            {favorites.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                    {f.food_name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {f.calories} {t('meal.kcal')} · {t('meal.protein')} {f.protein}g ·{' '}
                    {t('meal.carbs')} {f.carbs}g · {t('meal.fat')} {f.fat}g
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeMealFavorite(f.id)}
                  className="shrink-0 text-xs text-slate-300 hover:text-red-500"
                >
                  {t('form.delete')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-slate-200 dark:bg-slate-700" />

      <div className="space-y-3">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {t('form.addFavorite')}
        </span>
        <Field label={t('form.foodName')}>
          <TextInput value={form.food_name} onChange={set('food_name')} />
        </Field>
        <button
          type="button"
          onClick={analyze}
          disabled={analyzing || !form.food_name.trim()}
          className="w-full rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-2 text-sm font-bold disabled:opacity-50"
        >
          {analyzing ? t('form.analyzing') : t('form.analyze')}
        </button>
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
        <button
          type="button"
          onClick={save}
          disabled={saving || !form.food_name.trim()}
          className="w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-white shadow shadow-brand/30 disabled:opacity-50"
        >
          {t('form.save')}
        </button>
      </div>
    </div>
  );
}
