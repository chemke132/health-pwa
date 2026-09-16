import { useTranslation } from 'react-i18next';
import {
  useAppStore,
  selectDayTotals,
  selectWeightForDate,
  selectWeightSeries,
  selectNetCalorieSeries,
} from '../store/useAppStore';
import Card from '../components/Card';
import TrendChart from '../components/TrendChart';
import { shortDateLabel } from '../lib/timezone';
import { toDisplayWeight, unitLabel } from '../lib/units';

function Stat({ label, value, unit }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="mt-1 text-2xl font-black tabular-nums text-slate-800 dark:text-slate-100">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-slate-400">{unit}</span>}
      </span>
    </div>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const totals = useAppStore(selectDayTotals);
  const weight = useAppStore(selectWeightForDate);
  const weightSeries = useAppStore(selectWeightSeries);
  const calorieSeries = useAppStore(selectNetCalorieSeries);
  const unit = useAppStore((s) => s.weightUnit);

  // weight series is stored in kg → convert to the display unit
  const weightData = weightSeries.map((p) => ({
    label: shortDateLabel(p.dateKey),
    value: toDisplayWeight(p.value, unit),
  }));
  const calorieData = calorieSeries.map((p) => ({
    label: shortDateLabel(p.dateKey),
    value: p.value,
  }));

  return (
    <div className="space-y-4">
      {/* Desktop: responsive CSS Grid dashboard. Mobile: single column. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <Stat label={t('home.caloriesIn')} value={totals.caloriesIn} unit="kcal" />
        </Card>
        <Card>
          <Stat label={t('home.caloriesOut')} value={totals.caloriesOut} unit="kcal" />
        </Card>
        <Card>
          <Stat label={t('home.net')} value={totals.net} unit="kcal" />
        </Card>
        <Card>
          <Stat
            label={t('home.weight')}
            value={weight ? toDisplayWeight(weight.weight, unit) : t('home.noWeight')}
            unit={weight ? unitLabel(unit) : ''}
          />
        </Card>
      </div>

      {/* Trend charts (last 30 days) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title={t('home.weightTrend')}>
          {weightData.length >= 2 ? (
            <TrendChart data={weightData} unit={unitLabel(unit)} />
          ) : (
            <p className="text-sm text-slate-400">{t('home.notEnoughData')}</p>
          )}
        </Card>
        <Card title={t('home.calorieTrend')}>
          {calorieData.length >= 2 ? (
            <TrendChart data={calorieData} unit=" kcal" />
          ) : (
            <p className="text-sm text-slate-400">{t('home.notEnoughData')}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
