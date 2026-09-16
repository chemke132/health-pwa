import { shiftDateKey, todayKey, shortDateLabel } from './timezone';

// ~7,700 kcal deficit ≈ 1 kg of body fat.
const KCAL_PER_KG = 7700;
// Cap ETA at ~3 years; beyond that we show a gentle "too far" message.
const MAX_ETA_DAYS = 1095;

/** Most recent recorded weight (or null). */
export function latestWeight(weights) {
  if (!weights?.length) return null;
  return [...weights].sort((a, b) => b.record_date.localeCompare(a.record_date))[0].weight;
}

function groupSum(rows, valKey) {
  const m = {};
  for (const r of rows) {
    m[r.record_date] = (m[r.record_date] || 0) + (Number(r[valKey]) || 0);
  }
  return m;
}

/**
 * Chart rows for the last `days` days:
 *   { dateKey, label, weight (actual|null), ma (7-day moving average|null) }
 * The moving average smooths daily fluctuation to reduce "scale stress".
 */
export function buildChartData(weights, days = 14, endKey = todayKey()) {
  const byDate = {};
  for (const w of weights) byDate[w.record_date] = w.weight;

  const rows = [];
  for (let i = days - 1; i >= 0; i--) {
    const dateKey = shiftDateKey(endKey, -i);
    const actual = byDate[dateKey] ?? null;

    // 7-day moving average ending on this day (average of whatever points exist).
    let sum = 0;
    let n = 0;
    for (let j = 0; j < 7; j++) {
      const k = shiftDateKey(dateKey, -j);
      if (byDate[k] != null) {
        sum += byDate[k];
        n += 1;
      }
    }
    const ma = n ? Math.round((sum / n) * 10) / 10 : null;

    rows.push({ dateKey, label: shortDateLabel(dateKey), weight: actual, ma });
  }
  return rows;
}

/**
 * Goal-ETA using the 7-day average calorie deficit.
 * Returns a status the UI turns into a (gentle) message:
 *   'need_data' | 'reached' | 'surplus' | 'too_far' | 'ok'
 */
export function computeEta({ weights, meals, workouts, profile, endKey = todayKey() }) {
  const bmr = Number(profile?.bmr) || 0;
  const target = Number(profile?.target_weight) || 0;
  const current = latestWeight(weights) ?? (Number(profile?.current_weight) || 0);

  // Need profile basics + a current weight to predict anything.
  if (!bmr || !target || !current) return { status: 'need_data' };

  const remaining = current - target;
  if (remaining <= 0) return { status: 'reached', current, target };

  const intakeByDate = groupSum(meals, 'calories');
  const burnedByDate = groupSum(workouts, 'burned_calories');

  // Sum daily deficits over the last 7 days; empty days count as 0 deficit.
  let sumDeficit = 0;
  let loggedDays = 0;
  for (let i = 0; i < 7; i++) {
    const k = shiftDateKey(endKey, -i);
    const hasData = k in intakeByDate || k in burnedByDate;
    if (!hasData) continue; // empty day → deficit 0
    loggedDays += 1;
    const dailyBurn = bmr + (burnedByDate[k] || 0);
    const dailyIntake = intakeByDate[k] || 0;
    sumDeficit += dailyBurn - dailyIntake;
  }

  if (loggedDays === 0) return { status: 'need_data' };

  const avgDeficit = sumDeficit / 7; // average over the full 7-day window
  if (avgDeficit <= 0) return { status: 'surplus', remaining: round1(remaining) };

  const weeklyLossKg = (avgDeficit * 7) / KCAL_PER_KG;
  const weeks = remaining / weeklyLossKg;
  const etaDays = Math.round(weeks * 7);

  if (!Number.isFinite(etaDays) || etaDays <= 0 || etaDays > MAX_ETA_DAYS) {
    return { status: 'too_far', weeklyLossKg: round2(weeklyLossKg) };
  }

  return {
    status: 'ok',
    etaDays,
    etaDateKey: shiftDateKey(endKey, etaDays),
    weeklyLossKg: round2(weeklyLossKg),
    avgDeficit: Math.round(avgDeficit),
    remaining: round1(remaining),
  };
}

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;
