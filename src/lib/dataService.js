import { supabase } from './supabase';
import { dateKeyDaysAgo, todayKey } from './timezone';

/**
 * Architecture constraint: on app load we fetch the LAST 30 DAYS of every
 * record type ONCE, cache it in the store, and then filter locally per selected
 * date. This keeps day-to-day navigation instant and network-free.
 */
export async function fetchRecent30Days(userId) {
  const from = dateKeyDaysAgo(30);
  const to = todayKey();

  const [meals, workouts, weights, profile, routines] = await Promise.all([
    supabase
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .gte('record_date', from)
      .lte('record_date', to)
      .order('record_date', { ascending: false }),
    supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .gte('record_date', from)
      .lte('record_date', to)
      .order('record_date', { ascending: false }),
    supabase
      .from('weights')
      .select('*')
      .eq('user_id', userId)
      .gte('record_date', from)
      .lte('record_date', to)
      .order('record_date', { ascending: false }),
    supabase.from('users').select('*').eq('id', userId).maybeSingle(),
    supabase
      .from('routines')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  ]);

  const firstError =
    meals.error || workouts.error || weights.error || profile.error;
  // routines table may not exist yet — treat as empty rather than failing
  if (firstError) throw firstError;

  return {
    meals: meals.data ?? [],
    workouts: workouts.data ?? [],
    weights: weights.data ?? [],
    profile: profile.data ?? null,
    routines: routines.error ? [] : routines.data ?? [],
    fetchedAt: Date.now(),
  };
}

/* ------------------------------------------------------------------ */
/* Mutations — each inserts/updates one row and returns it so the       */
/* store can patch its local 30-day cache without a full refetch.       */
/* ------------------------------------------------------------------ */

export async function insertMeal(userId, recordDate, payload) {
  const { data, error } = await supabase
    .from('meals')
    .insert({ user_id: userId, record_date: recordDate, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function insertWorkout(userId, recordDate, payload) {
  const { data, error } = await supabase
    .from('workouts')
    .insert({ user_id: userId, record_date: recordDate, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** One weight per day: update the existing row if given, else insert. */
export async function saveWeight(userId, recordDate, weight, existingId) {
  if (existingId) {
    const { data, error } = await supabase
      .from('weights')
      .update({ weight })
      .eq('id', existingId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from('weights')
    .insert({ user_id: userId, record_date: recordDate, weight })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Upsert the profile row (goal / body metrics). */
export async function saveProfile(userId, patch) {
  const { data, error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

export async function insertRoutine(userId, name, exercises) {
  const { data, error } = await supabase
    .from('routines')
    .insert({ user_id: userId, name, exercises })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRoutine(id, name, exercises) {
  const { data, error } = await supabase
    .from('routines')
    .update({ name, exercises })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
