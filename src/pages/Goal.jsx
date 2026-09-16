import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAppStore } from '../store/useAppStore';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { Field, TextInput, FormActions } from '../components/Field';
import { buildChartData, computeEta, latestWeight } from '../lib/goalMath';
import { formatHeaderDate } from '../lib/timezone';
import {
  toDisplayWeight,
  toKg,
  weightUnitLabel,
  formatHeight,
  cmToFtIn,
  ftInToCm,
} from '../lib/units';

const BRAND = '#0ea5e9';
const ACTUAL = '#94a3b8';

function EtaBanner({ eta, system }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage?.startsWith('ko') ? 'ko' : 'en';

  const tone = {
    ok: 'from-brand/20 to-brand/5 text-brand-fg dark:text-brand',
    reached: 'from-emerald-400/20 to-emerald-400/5 text-emerald-700 dark:text-emerald-300',
    surplus: 'from-amber-400/20 to-amber-400/5 text-amber-700 dark:text-amber-300',
    too_far: 'from-slate-300/30 to-slate-300/5 text-slate-600 dark:text-slate-300',
    need_data: 'from-slate-300/30 to-slate-300/5 text-slate-600 dark:text-slate-300',
  }[eta.status];

  let main;
  let sub = null;
  if (eta.status === 'ok') {
    main = t('goal.etaOnTrack', { days: eta.etaDays });
    sub = t('goal.etaSub', {
      val: toDisplayWeight(eta.weeklyLossKg, system),
      unit: weightUnitLabel(system),
      date: formatHeaderDate(eta.etaDateKey, locale),
    });
  } else {
    main = t(`goal.${etaKey(eta.status)}`);
  }

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tone} p-5`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-70 mb-1">
        {t('goal.etaTitle')}
      </p>
      <p className="text-lg font-black leading-snug">{main}</p>
      {sub && <p className="text-sm font-medium opacity-80 mt-1">{sub}</p>}
    </div>
  );
}

function etaKey(status) {
  return {
    reached: 'etaReached',
    surplus: 'etaSurplus',
    too_far: 'etaTooFar',
    need_data: 'etaNeedData',
  }[status];
}

export default function Goal() {
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.appData.profile);
  const weights = useAppStore((s) => s.appData.weights);
  const meals = useAppStore((s) => s.appData.meals);
  const workouts = useAppStore((s) => s.appData.workouts);
  const currentDate = useAppStore((s) => s.currentDate);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const setWeight = useAppStore((s) => s.setWeight);
  const system = useAppStore((s) => s.unitSystem);

  const eta = computeEta({ weights, meals, workouts, profile });
  const rawChart = buildChartData(weights, 14);
  const hasChart = rawChart.some((d) => d.weight != null);
  // convert kg → display unit for the chart
  const chartData = rawChart.map((r) => ({
    ...r,
    weight: toDisplayWeight(r.weight, system),
    ma: toDisplayWeight(r.ma, system),
  }));
  const current = latestWeight(weights) ?? profile?.current_weight ?? null;

  // weight input (shown in the display unit; saved as kg)
  const existingToday = weights.find((w) => w.record_date === currentDate);
  const [weightVal, setWeightVal] = useState(
    toDisplayWeight(existingToday?.weight, system) ?? ''
  );
  const [savingW, setSavingW] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const saveWeight = async (e) => {
    e.preventDefault();
    if (weightVal === '') return;
    setSavingW(true);
    try {
      await setWeight(toKg(weightVal, system));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } finally {
      setSavingW(false);
    }
  };

  // goal edit modal (height stored in cm; imperial edits ft + in)
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({
    current_weight: '',
    target_weight: '',
    bmr: '',
    height_cm: '',
    height_ft: '',
    height_in: '',
  });
  const [savingG, setSavingG] = useState(false);
  const [error, setError] = useState(null);
  const numOrNull = (v) => (v === '' ? null : Number(v));
  const setG = (k) => (e) => setGoalForm((f) => ({ ...f, [k]: e.target.value }));

  const openGoal = () => {
    const ftin = cmToFtIn(profile?.height);
    setGoalForm({
      current_weight: toDisplayWeight(profile?.current_weight, system) ?? '',
      target_weight: toDisplayWeight(profile?.target_weight, system) ?? '',
      bmr: profile?.bmr ?? '',
      height_cm: profile?.height ?? '',
      height_ft: ftin.ft,
      height_in: ftin.in,
    });
    setError(null);
    setGoalOpen(true);
  };

  const submitGoal = async (e) => {
    e.preventDefault();
    setSavingG(true);
    setError(null);
    try {
      const height =
        system === 'imperial'
          ? ftInToCm(goalForm.height_ft, goalForm.height_in)
          : numOrNull(goalForm.height_cm);
      await updateProfile({
        current_weight: toKg(goalForm.current_weight, system),
        target_weight: toKg(goalForm.target_weight, system),
        bmr: numOrNull(goalForm.bmr),
        height,
      });
      setGoalOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingG(false);
    }
  };

  const metrics = [
    { label: t('goal.currentWeight'), value: toDisplayWeight(current, system), unit: weightUnitLabel(system) },
    { label: t('goal.targetWeight'), value: toDisplayWeight(profile?.target_weight, system), unit: weightUnitLabel(system) },
    { label: t('goal.height'), value: formatHeight(profile?.height, system), unit: '' },
    { label: t('goal.bmr'), value: profile?.bmr, unit: 'kcal' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-black">{t('goal.title')}</h1>
        <button
          type="button"
          onClick={openGoal}
          className="rounded-xl bg-brand px-3 py-1.5 text-sm font-bold text-white shadow shadow-brand/30"
        >
          {t('form.editGoal')}
        </button>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <Card key={m.label}>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {m.label}
            </span>
            <p className="mt-1 text-xl md:text-2xl font-black tabular-nums text-slate-800 dark:text-slate-100">
              {m.value ?? '—'}
              <span className="ml-1 text-xs font-medium text-slate-400">{m.unit}</span>
            </p>
          </Card>
        ))}
      </div>

      {/* ETA prediction */}
      <EtaBanner eta={eta} system={system} />

      {/* Moving-average chart */}
      <Card title={t('goal.chartTitle')}>
        {hasChart ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: ACTUAL }} interval="preserveStartEnd" />
              <YAxis
                tick={{ fontSize: 11, fill: ACTUAL }}
                width={44}
                domain={[(min) => Math.floor(min - 1), (max) => Math.ceil(max + 1)]}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}
                formatter={(v, name) => [v != null ? `${v} ${weightUnitLabel(system)}` : '—', name]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="ma"
                name={t('goal.legendMa')}
                stroke={BRAND}
                strokeWidth={2.5}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="weight"
                name={t('goal.legendActual')}
                stroke={ACTUAL}
                strokeWidth={0}
                dot={{ r: 3, fill: ACTUAL }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-400">{t('goal.chartEmpty')}</p>
        )}
      </Card>

      {/* Big weight input */}
      <Card>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {t('goal.logTitle')}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{t('goal.logHint')}</p>
        <form onSubmit={saveWeight} className="mt-3 flex items-center gap-3">
          <div className="flex items-end gap-2 flex-1">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weightVal}
              onChange={(e) => setWeightVal(e.target.value)}
              placeholder="0.0"
              className="w-36 bg-transparent text-4xl font-black tabular-nums text-slate-800 dark:text-slate-100 outline-none border-b-2 border-slate-200 dark:border-slate-700 focus:border-brand"
            />
            <span className="text-lg font-bold text-slate-400 pb-1">{weightUnitLabel(system)}</span>
          </div>
          <button
            type="submit"
            disabled={savingW || weightVal === ''}
            className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow shadow-brand/30 disabled:opacity-50"
          >
            {savedFlash ? t('goal.saved') : t('form.save')}
          </button>
        </form>
      </Card>

      {/* Edit goal / body metrics */}
      <Modal open={goalOpen} onClose={() => setGoalOpen(false)} title={t('form.editGoal')}>
        <form onSubmit={submitGoal} className="space-y-3">
          <Field label={`${t('goal.currentWeight')} (${weightUnitLabel(system)})`}>
            <TextInput
              type="number"
              inputMode="decimal"
              value={goalForm.current_weight}
              onChange={setG('current_weight')}
              autoFocus
            />
          </Field>
          <Field label={`${t('goal.targetWeight')} (${weightUnitLabel(system)})`}>
            <TextInput
              type="number"
              inputMode="decimal"
              value={goalForm.target_weight}
              onChange={setG('target_weight')}
            />
          </Field>

          {/* Height: cm in metric, ft + in in imperial */}
          {system === 'imperial' ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label={`${t('goal.height')} (ft)`}>
                <TextInput type="number" inputMode="numeric" value={goalForm.height_ft} onChange={setG('height_ft')} />
              </Field>
              <Field label={`${t('goal.height')} (in)`}>
                <TextInput type="number" inputMode="numeric" value={goalForm.height_in} onChange={setG('height_in')} />
              </Field>
            </div>
          ) : (
            <Field label={`${t('goal.height')} (cm)`}>
              <TextInput type="number" inputMode="numeric" value={goalForm.height_cm} onChange={setG('height_cm')} />
            </Field>
          )}

          <Field label={t('goal.bmr')}>
            <TextInput
              type="number"
              inputMode="numeric"
              value={goalForm.bmr}
              onChange={(e) => setGoalForm((f) => ({ ...f, bmr: e.target.value }))}
            />
          </Field>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <FormActions
            onCancel={() => setGoalOpen(false)}
            saving={savingG}
            cancelLabel={t('form.cancel')}
            saveLabel={t('form.save')}
          />
        </form>
      </Modal>
    </div>
  );
}
