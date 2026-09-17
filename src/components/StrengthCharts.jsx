import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAppStore } from '../store/useAppStore';
import Card from './Card';
import { weeklyVolumeSeries, oneRmSeries, exerciseNames } from '../lib/strength';
import { shortDateLabel } from '../lib/timezone';
import { toDisplayWeight, weightUnitLabel, LB_PER_KG } from '../lib/units';

const BRAND = '#0ea5e9';
const AXIS = '#94a3b8';

/**
 * Muscle-growth indicators: weekly training volume (stimulus) and per-lift
 * estimated-1RM progression (strength ≈ growth). Reads the cached workouts.
 */
export default function StrengthCharts({ workouts }) {
  const { t } = useTranslation();
  const system = useAppStore((s) => s.unitSystem);
  const wl = weightUnitLabel(system);

  const names = exerciseNames(workouts);
  const [lift, setLift] = useState(names[0] || '');
  const selected = names.includes(lift) ? lift : names[0] || '';

  const toDisp = (kg) => (system === 'imperial' ? Math.round(kg * LB_PER_KG) : Math.round(kg));

  const volumeData = weeklyVolumeSeries(workouts).map((r) => ({
    label: shortDateLabel(r.weekStart),
    volume: toDisp(r.volume),
  }));

  const rmData = selected
    ? oneRmSeries(workouts, selected).map((r) => ({
        label: shortDateLabel(r.dateKey),
        value: toDisplayWeight(r.value, system),
      }))
    : [];

  const hasVolume = volumeData.length > 0;
  const hasRm = rmData.length > 0;

  if (!hasVolume && !hasRm) {
    return (
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {t('workout.charts')}
        </h2>
        <Card>
          <p className="text-sm text-slate-400">{t('workout.noStrengthData')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {t('workout.charts')}
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title={`${t('workout.volumeTrend')} (${wl})`}>
          {hasVolume ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={volumeData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} />
                <YAxis tick={{ fontSize: 11, fill: AXIS }} width={44} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}
                  formatter={(v) => [`${v} ${wl}`, t('form.volume')]}
                />
                <Bar dataKey="volume" fill={BRAND} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400">{t('workout.noStrengthData')}</p>
          )}
        </Card>

        <Card title={t('workout.rmTrend')}>
          {names.length > 0 ? (
            <>
              <select
                value={selected}
                onChange={(e) => setLift(e.target.value)}
                className="mb-2 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm text-slate-800 dark:text-slate-100"
              >
                {names.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              {hasRm ? (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={rmData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: AXIS }}
                      width={44}
                      domain={[(min) => Math.floor(min - 2), (max) => Math.ceil(max + 2)]}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}
                      formatter={(v) => [`${v} ${wl}`, t('form.estimated1rm')]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={BRAND}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: BRAND }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-400">{t('workout.noStrengthData')}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400">{t('workout.noStrengthData')}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
