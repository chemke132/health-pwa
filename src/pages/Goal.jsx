import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, selectWeightForDate } from '../store/useAppStore';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { Field, TextInput, FormActions } from '../components/Field';

export default function Goal() {
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.appData.profile);
  const weight = useAppStore(selectWeightForDate);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const setWeight = useAppStore((s) => s.setWeight);

  const [goalOpen, setGoalOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [goalForm, setGoalForm] = useState({
    current_weight: '',
    target_weight: '',
    bmr: '',
  });
  const [weightVal, setWeightVal] = useState('');

  const num = (v) => (v === '' ? null : Number(v));

  const openGoal = () => {
    setGoalForm({
      current_weight: profile?.current_weight ?? '',
      target_weight: profile?.target_weight ?? '',
      bmr: profile?.bmr ?? '',
    });
    setError(null);
    setGoalOpen(true);
  };

  const openWeight = () => {
    setWeightVal(weight?.weight ?? '');
    setError(null);
    setWeightOpen(true);
  };

  const submitGoal = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        current_weight: num(goalForm.current_weight),
        target_weight: num(goalForm.target_weight),
        bmr: num(goalForm.bmr),
      });
      setGoalOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const submitWeight = async (e) => {
    e.preventDefault();
    if (weightVal === '') return;
    setSaving(true);
    setError(null);
    try {
      await setWeight(Number(weightVal));
      setWeightOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const rows = [
    { key: 'goal.currentWeight', value: profile?.current_weight, unit: t('goal.kg') },
    { key: 'goal.targetWeight', value: profile?.target_weight, unit: t('goal.kg') },
    { key: 'goal.bmr', value: profile?.bmr, unit: 'kcal' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-black">{t('goal.title')}</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openWeight}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t('form.logWeight')}
          </button>
          <button
            type="button"
            onClick={openGoal}
            className="rounded-xl bg-brand px-3 py-1.5 text-sm font-bold text-white shadow shadow-brand/30"
          >
            {t('form.editGoal')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {rows.map((r) => (
          <Card key={r.key}>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t(r.key)}
            </span>
            <p className="mt-1 text-2xl font-black tabular-nums text-slate-800 dark:text-slate-100">
              {r.value ?? '—'}
              <span className="ml-1 text-sm font-medium text-slate-400">{r.unit}</span>
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t('home.weight')} · {t('common.today')}
        </span>
        <p className="mt-1 text-2xl font-black tabular-nums text-slate-800 dark:text-slate-100">
          {weight ? weight.weight : t('home.noWeight')}
          {weight && <span className="ml-1 text-sm font-medium text-slate-400">{t('goal.kg')}</span>}
        </p>
      </Card>

      {/* Edit goal / body metrics */}
      <Modal open={goalOpen} onClose={() => setGoalOpen(false)} title={t('form.editGoal')}>
        <form onSubmit={submitGoal} className="space-y-3">
          <Field label={t('goal.currentWeight')}>
            <TextInput
              type="number"
              inputMode="decimal"
              value={goalForm.current_weight}
              onChange={(e) => setGoalForm((f) => ({ ...f, current_weight: e.target.value }))}
              autoFocus
            />
          </Field>
          <Field label={t('goal.targetWeight')}>
            <TextInput
              type="number"
              inputMode="decimal"
              value={goalForm.target_weight}
              onChange={(e) => setGoalForm((f) => ({ ...f, target_weight: e.target.value }))}
            />
          </Field>
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
            saving={saving}
            cancelLabel={t('form.cancel')}
            saveLabel={t('form.save')}
          />
        </form>
      </Modal>

      {/* Log today's weight */}
      <Modal open={weightOpen} onClose={() => setWeightOpen(false)} title={t('form.logWeight')}>
        <form onSubmit={submitWeight} className="space-y-3">
          <Field label={t('form.weight')}>
            <TextInput
              type="number"
              inputMode="decimal"
              value={weightVal}
              onChange={(e) => setWeightVal(e.target.value)}
              autoFocus
            />
          </Field>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <FormActions
            onCancel={() => setWeightOpen(false)}
            saving={saving}
            cancelLabel={t('form.cancel')}
            saveLabel={t('form.save')}
          />
        </form>
      </Modal>
    </div>
  );
}
