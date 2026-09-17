import { useTranslation } from 'react-i18next';
import { useAppStore, selectMealMacros } from '../store/useAppStore';
import Card from './Card';
import { computeTargets, DIET_MODES } from '../lib/nutritionTargets';

function Bar({ label, consumed, target, unit }) {
  const { t } = useTranslation();
  const c = Math.round(consumed);
  const pct = target ? Math.min(100, Math.round((c / target) * 100)) : 0;
  const remaining = target - c;
  const over = remaining < 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold text-slate-700 dark:text-slate-200">{label}</span>
        <span className="tabular-nums text-slate-500 dark:text-slate-400">
          <b className="text-slate-800 dark:text-slate-100">{c}</b> / {target}
          {unit}
          <span className={`ml-2 font-semibold ${over ? 'text-amber-600' : 'text-emerald-600'}`}>
            {over ? t('nutrition.over') : t('nutrition.left')} {Math.abs(remaining)}
            {unit}
          </span>
        </span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div
          className={`h-full rounded-full ${over ? 'bg-amber-500' : 'bg-brand'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Recommended daily nutrition vs. what's eaten for the selected day.
 * `showModeSelector` lets the user switch maintain/diet/bulk (saved to profile).
 */
export default function NutritionSummary({ showModeSelector = false }) {
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.appData.profile);
  const eaten = useAppStore(selectMealMacros);
  const updateProfile = useAppStore((s) => s.updateProfile);

  const mode = DIET_MODES.includes(profile?.diet_mode) ? profile.diet_mode : 'maintain';
  const targets = computeTargets(profile, mode);

  const setMode = (m) => updateProfile({ diet_mode: m }).catch(() => {});

  return (
    <Card title={t('nutrition.title')}>
      {showModeSelector && (
        <div className="mb-3 inline-flex w-full rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
          {DIET_MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-lg py-2 text-sm font-bold transition-colors ${
                mode === m
                  ? 'bg-white dark:bg-slate-900 text-brand-fg dark:text-brand shadow'
                  : 'text-slate-500'
              }`}
            >
              {t(`nutrition.${m}`)}
            </button>
          ))}
        </div>
      )}

      {!targets ? (
        <p className="text-sm text-slate-400">{t('nutrition.needBmr')}</p>
      ) : (
        <div className="space-y-3">
          <Bar label={t('nutrition.calories')} consumed={eaten.calories} target={targets.calories} unit=" kcal" />
          <Bar label={t('meal.protein')} consumed={eaten.protein} target={targets.protein} unit="g" />
          <Bar label={t('meal.carbs')} consumed={eaten.carbs} target={targets.carbs} unit="g" />
          <Bar label={t('meal.fat')} consumed={eaten.fat} target={targets.fat} unit="g" />
        </div>
      )}
    </Card>
  );
}
