import { useTranslation } from 'react-i18next';
import {
  useAppStore,
  selectDayTotals,
  selectWeightForDate,
} from '../store/useAppStore';
import Card from '../components/Card';

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
            value={weight ? weight.weight : t('home.noWeight')}
            unit={weight ? t('goal.kg') : ''}
          />
        </Card>
      </div>
    </div>
  );
}
