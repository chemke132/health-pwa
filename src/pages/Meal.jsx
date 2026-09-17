import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, selectMealsForDate } from '../store/useAppStore';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { Field, TextInput, FormActions } from '../components/Field';
import { parseMealText } from '../lib/ai';
import { useFoodTranslations } from '../lib/foodTranslate';
import MealFavorites from '../components/MealFavorites';
import NutritionSummary from '../components/NutritionSummary';

const CATEGORIES = ['breakfast', 'lunch', 'dinner', 'snack', 'latenight'];
const catOf = (m) => (CATEGORIES.includes(m.meal_type) ? m.meal_type : 'snack');

const EMPTY = { food_name: '', calories: '', protein: '', carbs: '', fat: '' };

export default function Meal() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage?.startsWith('ko') ? 'ko' : 'en';
  const meals = useAppStore(selectMealsForDate);
  const mealFavorites = useAppStore((s) => s.appData.mealFavorites);
  const addMeal = useAppStore((s) => s.addMeal);
  const removeRow = useAppStore((s) => s.removeRow);

  const nameMap = useFoodTranslations(meals.map((m) => m.food_name), lang);

  const byCat = Object.fromEntries(CATEGORIES.map((c) => [c, []]));
  for (const m of meals) byCat[catOf(m)].push(m);

  // modal
  const [open, setOpen] = useState(false);
  const [favOpen, setFavOpen] = useState(false);
  const [mealType, setMealType] = useState('breakfast');
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

  const openAdd = (cat) => {
    resetForm();
    setMealType(cat);
    setOpen(true);
  };

  const quickAdd = async (fav) => {
    setChipBusy(fav.id);
    setError(null);
    try {
      await addMeal({
        food_name: fav.food_name,
        calories: fav.calories,
        protein: fav.protein,
        carbs: fav.carbs,
        fat: fav.fat,
        meal_type: mealType,
        input_type: 'favorite',
      });
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setChipBusy(null);
    }
  };

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
        meal_type: mealType,
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
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl md:text-2xl font-black">{t('meal.title')}</h1>
        <button
          type="button"
          onClick={() => setFavOpen(true)}
          className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-bold text-slate-600 dark:text-slate-300"
        >
          ⭐ {t('form.manageFavorites')}
        </button>
      </div>

      {error && !open && <p className="text-sm text-red-500">{error}</p>}

      <NutritionSummary showModeSelector />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {CATEGORIES.map((cat) => {
          const list = byCat[cat];
          const total = list.reduce((s, m) => s + (m.calories ?? 0), 0);
          return (
            <Card key={cat}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-baseline gap-2">
                  <h2 className="font-black text-slate-800 dark:text-slate-100">
                    {t(`meal.${cat}`)}
                  </h2>
                  {total > 0 && (
                    <span className="text-xs font-semibold text-brand-fg dark:text-brand tabular-nums">
                      {total} {t('meal.kcal')}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => openAdd(cat)}
                  className="rounded-lg bg-brand/10 text-brand-fg dark:text-brand px-2.5 py-1 text-xs font-bold"
                >
                  + {t('form.add')}
                </button>
              </div>

              {list.length === 0 ? (
                <p className="text-xs text-slate-400">{t('meal.emptyCategory')}</p>
              ) : (
                <ul className="space-y-2">
                  {list.map((m) => (
                    <li key={m.id} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {nameMap[m.food_name] ?? m.food_name}
                        </p>
                        <p className="text-[11px] text-slate-400 space-x-1.5">
                          <span>{t('meal.protein')} {m.protein ?? 0}g</span>
                          <span>{t('meal.carbs')} {m.carbs ?? 0}g</span>
                          <span>{t('meal.fat')} {m.fat ?? 0}g</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-sm font-black tabular-nums text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {m.calories ?? 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeRow('meals', m.id)}
                          className="text-[11px] text-slate-300 hover:text-red-500"
                        >
                          {t('form.delete')}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={`${t('form.addMeal')} · ${t(`meal.${mealType}`)}`}>
        <div className="space-y-4">
          {/* Favorites (quick add to this meal) */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              {t('form.favorites')}
            </p>
            {mealFavorites.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setFavOpen(true);
                }}
                className="text-xs text-brand-fg dark:text-brand font-semibold"
              >
                + {t('form.addFavorite')}
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
                {mealFavorites.map((fav) => (
                  <button
                    key={fav.id}
                    type="button"
                    onClick={() => quickAdd(fav)}
                    disabled={chipBusy === fav.id}
                    className="rounded-full border border-brand/40 bg-brand/10 text-brand-fg dark:text-brand px-3 py-1.5 text-sm font-semibold hover:bg-brand/20 disabled:opacity-50"
                  >
                    {chipBusy === fav.id ? '…' : `+ ${fav.food_name}`}
                  </button>
                ))}
              </div>
            )}
          </div>

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

          <form onSubmit={submit} className="space-y-3">
            {aiFilled && <p className="text-xs text-emerald-600">{t('form.aiFilled')}</p>}
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

      <Modal open={favOpen} onClose={() => setFavOpen(false)} title={t('form.manageFavorites')}>
        <MealFavorites />
      </Modal>
    </div>
  );
}
