import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  fetchRecent30Days,
  insertMeal,
  insertWorkout,
  saveWeight,
  saveProfile,
  deleteRow,
} from '../lib/dataService';
import { todayKey } from '../lib/timezone';

function readWeightUnit() {
  try {
    return localStorage.getItem('app_weight_unit') === 'lb' ? 'lb' : 'kg';
  } catch {
    return 'kg';
  }
}

/**
 * Single source of truth for the app.
 *  - user:        the authenticated Supabase user (or null)
 *  - currentDate: the selected day key `yyyy-MM-dd` (Pacific Time)
 *  - appData:     the cached last-30-days payload (meals/workouts/weights/profile)
 *
 * Data is fetched ONCE (loadAppData) and everything else filters locally via
 * the selector helpers below.
 */
export const useAppStore = create((set, get) => ({
  // --- auth ---
  user: null,
  authReady: false,
  setUser: (user) => set({ user }),
  setAuthReady: (authReady) => set({ authReady }),

  // --- selected date ---
  currentDate: todayKey(),
  setCurrentDate: (currentDate) => set({ currentDate }),

  // --- display unit for weight (kg canonical in DB) ---
  weightUnit: readWeightUnit(),
  setWeightUnit: (weightUnit) => {
    try {
      localStorage.setItem('app_weight_unit', weightUnit);
    } catch {
      // ignore storage errors (private mode, etc.)
    }
    set({ weightUnit });
  },

  // --- cached data ---
  appData: { meals: [], workouts: [], weights: [], profile: null, fetchedAt: 0 },
  dataLoading: false,
  dataError: null,

  async loadAppData() {
    const { user } = get();
    if (!user) return;
    set({ dataLoading: true, dataError: null });
    try {
      const appData = await fetchRecent30Days(user.id);
      set({ appData, dataLoading: false });
    } catch (err) {
      set({ dataError: err, dataLoading: false });
    }
  },

  reset: () =>
    set({
      user: null,
      currentDate: todayKey(),
      appData: { meals: [], workouts: [], weights: [], profile: null, fetchedAt: 0 },
      dataError: null,
    }),

  /* --- mutations: write to Supabase, then patch the local cache --- */

  async addMeal(payload) {
    const { user, currentDate, appData } = get();
    const row = await insertMeal(user.id, currentDate, payload);
    set({ appData: { ...appData, meals: [row, ...appData.meals] } });
    return row;
  },

  async addWorkout(payload) {
    const { user, currentDate, appData } = get();
    const row = await insertWorkout(user.id, currentDate, payload);
    set({ appData: { ...appData, workouts: [row, ...appData.workouts] } });
    return row;
  },

  async setWeight(weight) {
    const { user, currentDate, appData } = get();
    const existing = appData.weights.find((w) => w.record_date === currentDate);
    const row = await saveWeight(user.id, currentDate, weight, existing?.id);
    const others = appData.weights.filter((w) => w.id !== row.id);
    set({ appData: { ...appData, weights: [row, ...others] } });
    return row;
  },

  async updateProfile(patch) {
    const { user, appData } = get();
    const row = await saveProfile(user.id, patch);
    set({ appData: { ...appData, profile: row } });
    return row;
  },

  async removeRow(table, id) {
    const { appData } = get();
    await deleteRow(table, id);
    const key = table; // 'meals' | 'workouts' | 'weights'
    set({ appData: { ...appData, [key]: appData[key].filter((r) => r.id !== id) } });
  },
}));

/* ------------------------------------------------------------------ */
/* Local selectors — filter the cached 30 days by the selected date.   */
/* ------------------------------------------------------------------ */

export const selectMealsForDate = (state) =>
  state.appData.meals.filter((m) => m.record_date === state.currentDate);

export const selectWorkoutsForDate = (state) =>
  state.appData.workouts.filter((w) => w.record_date === state.currentDate);

export const selectWeightForDate = (state) =>
  state.appData.weights.find((w) => w.record_date === state.currentDate) ?? null;

/** Weight points sorted oldest → newest, for the trend chart. */
export const selectWeightSeries = (state) =>
  [...state.appData.weights]
    .sort((a, b) => a.record_date.localeCompare(b.record_date))
    .map((w) => ({ dateKey: w.record_date, value: w.weight }));

/** Net calories (in − out) per day that has any entry, oldest → newest. */
export const selectNetCalorieSeries = (state) => {
  const byDate = {};
  for (const m of state.appData.meals) {
    (byDate[m.record_date] ??= { in: 0, out: 0 }).in += m.calories ?? 0;
  }
  for (const w of state.appData.workouts) {
    (byDate[w.record_date] ??= { in: 0, out: 0 }).out += w.burned_calories ?? 0;
  }
  return Object.keys(byDate)
    .sort()
    .map((d) => ({ dateKey: d, value: byDate[d].in - byDate[d].out }));
};

export const selectDayTotals = (state) => {
  const meals = selectMealsForDate(state);
  const workouts = selectWorkoutsForDate(state);
  const caloriesIn = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const caloriesOut = workouts.reduce((s, w) => s + (w.burned_calories ?? 0), 0);
  return { caloriesIn, caloriesOut, net: caloriesIn - caloriesOut };
};

/**
 * Wire Supabase auth state into the store and preload data on sign-in.
 * Call once from main.jsx.
 */
export function initAuthListener() {
  const store = useAppStore.getState();

  supabase.auth.getSession().then(({ data }) => {
    const user = data.session?.user ?? null;
    useAppStore.setState({ user, authReady: true });
    if (user) useAppStore.getState().loadAppData();
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ?? null;
    const prev = useAppStore.getState().user;
    useAppStore.setState({ user, authReady: true });
    if (user && user.id !== prev?.id) {
      useAppStore.getState().loadAppData();
    }
    if (!user) store.reset();
  });
}
