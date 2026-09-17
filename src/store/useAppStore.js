import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  fetchRecent30Days,
  insertMeal,
  insertWorkout,
  saveWeight,
  saveProfile,
  deleteRow,
  insertRoutine,
  updateRoutine,
  insertMealFavorite,
} from '../lib/dataService';
import { enqueue, flushOutbox } from '../lib/sync';
import { todayKey } from '../lib/timezone';

/** Treat offline / fetch failures as "queue it"; real API errors rethrow. */
function isOfflineError(err) {
  if (!navigator.onLine) return true;
  const msg = String(err?.message || '');
  return /failed to fetch|networkerror|load failed/i.test(msg);
}

function readUnitSystem() {
  try {
    return localStorage.getItem('app_unit_system') === 'imperial' ? 'imperial' : 'metric';
  } catch {
    return 'metric';
  }
}

function readLiftUnit() {
  try {
    return localStorage.getItem('app_lift_unit') === 'lb' ? 'lb' : 'kg';
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

  // --- display unit system: 'metric' (kg/cm) | 'imperial' (lb/ft) ---
  // DB stays canonical (kg, cm); this only affects display + input.
  unitSystem: readUnitSystem(),
  setUnitSystem: (unitSystem) => {
    try {
      localStorage.setItem('app_unit_system', unitSystem);
    } catch {
      // ignore storage errors (private mode, etc.)
    }
    set({ unitSystem });
  },

  // --- lifting weight unit ('kg'|'lb'), independent of unitSystem ---
  liftUnit: readLiftUnit(),
  setLiftUnit: (liftUnit) => {
    try {
      localStorage.setItem('app_lift_unit', liftUnit);
    } catch {
      // ignore
    }
    set({ liftUnit });
  },

  // --- cached data ---
  appData: { meals: [], workouts: [], weights: [], profile: null, routines: [], mealFavorites: [], fetchedAt: 0 },
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
      appData: { meals: [], workouts: [], weights: [], profile: null, routines: [], mealFavorites: [], fetchedAt: 0 },
      dataError: null,
    }),

  /* --- mutations: write to Supabase, then patch the local cache --- */

  async addMeal(payload) {
    const { user, currentDate, appData } = get();
    const record = { user_id: user.id, record_date: currentDate, ...payload };
    try {
      const row = await insertMeal(user.id, currentDate, payload);
      set({ appData: { ...appData, meals: [row, ...appData.meals] } });
      return row;
    } catch (err) {
      if (!isOfflineError(err)) throw err;
      await enqueue('meals', record);
      const optimistic = { id: `pending-${Date.now()}`, _pending: true, ...record };
      set({ appData: { ...appData, meals: [optimistic, ...appData.meals] } });
      return optimistic;
    }
  },

  async addWorkout(payload) {
    const { user, currentDate, appData } = get();
    const record = { user_id: user.id, record_date: currentDate, ...payload };
    try {
      const row = await insertWorkout(user.id, currentDate, payload);
      set({ appData: { ...appData, workouts: [row, ...appData.workouts] } });
      return row;
    } catch (err) {
      if (!isOfflineError(err)) throw err;
      await enqueue('workouts', record);
      const optimistic = { id: `pending-${Date.now()}`, _pending: true, ...record };
      set({ appData: { ...appData, workouts: [optimistic, ...appData.workouts] } });
      return optimistic;
    }
  },

  async setWeight(weight) {
    const { user, currentDate, appData } = get();
    const existing = appData.weights.find((w) => w.record_date === currentDate);
    try {
      const row = await saveWeight(user.id, currentDate, weight, existing?.id);
      const others = appData.weights.filter((w) => w.id !== row.id);
      set({ appData: { ...appData, weights: [row, ...others] } });
      return row;
    } catch (err) {
      if (!isOfflineError(err)) throw err;
      const record = { user_id: user.id, record_date: currentDate, weight };
      await enqueue('weights', record);
      const others = appData.weights.filter((w) => w.record_date !== currentDate);
      const optimistic = { id: `pending-${Date.now()}`, _pending: true, ...record };
      set({ appData: { ...appData, weights: [optimistic, ...others] } });
      return optimistic;
    }
  },

  /** Flush the offline outbox to Supabase, then refresh from server. */
  async syncOutbox() {
    const n = await flushOutbox();
    if (n > 0) await get().loadAppData();
    return n;
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

  /* --- routines (saved workout templates) --- */

  async addRoutine(name, exercises) {
    const { user, appData } = get();
    const row = await insertRoutine(user.id, name, exercises);
    set({ appData: { ...appData, routines: [...appData.routines, row] } });
    return row;
  },

  async editRoutine(id, name, exercises) {
    const { appData } = get();
    const row = await updateRoutine(id, name, exercises);
    set({
      appData: {
        ...appData,
        routines: appData.routines.map((r) => (r.id === id ? row : r)),
      },
    });
    return row;
  },

  async removeRoutine(id) {
    const { appData } = get();
    await deleteRow('routines', id);
    set({ appData: { ...appData, routines: appData.routines.filter((r) => r.id !== id) } });
  },

  /* --- meal favorites (user-defined quick meals) --- */

  async addMealFavorite(payload) {
    const { user, appData } = get();
    const row = await insertMealFavorite(user.id, payload);
    set({ appData: { ...appData, mealFavorites: [...appData.mealFavorites, row] } });
    return row;
  },

  async removeMealFavorite(id) {
    const { appData } = get();
    await deleteRow('meal_favorites', id);
    set({
      appData: {
        ...appData,
        mealFavorites: appData.mealFavorites.filter((f) => f.id !== id),
      },
    });
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
