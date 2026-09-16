import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loud in dev so a missing .env.local is obvious.
  // eslint-disable-next-line no-console
  console.error(
    '[supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // OAuth providers redirect back with the session in the URL hash — parse it.
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

/**
 * Detect a standalone / installed PWA. Installed iOS & Android PWAs lose their
 * session if the OAuth flow opens the system browser (Safari/Chrome) and never
 * returns to the app context. We keep the flow inside the app window instead.
 */
export function isStandalonePWA() {
  if (typeof window === 'undefined') return false;
  const displayModeStandalone =
    window.matchMedia?.('(display-mode: standalone)')?.matches;
  const iosStandalone = window.navigator.standalone === true; // iOS Safari
  return Boolean(displayModeStandalone || iosStandalone);
}

/**
 * Google OAuth sign-in with a PWA-safe flow.
 *
 * - redirectTo returns to the same origin so the installed PWA regains focus
 *   with the auth code in the URL (detectSessionInUrl completes the exchange).
 * - skipBrowserRedirect: in a standalone PWA we avoid Supabase's automatic
 *   full-page redirect (which can bounce the user out to an external browser
 *   tab and never come back). We navigate the *current* window instead, keeping
 *   the session inside the app shell.
 */
export async function signInWithGoogle() {
  const redirectTo = window.location.origin;
  const standalone = isStandalonePWA();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: standalone,
      queryParams: {
        // keep the user on the account chooser and get a refresh token
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error) throw error;

  // When we skipped the auto-redirect (standalone PWA), drive the current
  // window ourselves so we stay in the same top-level browsing context.
  if (standalone && data?.url) {
    window.location.assign(data.url);
  }

  return data;
}

/**
 * Passwordless email "magic link" sign-in. Great for development because it
 * needs no external OAuth provider setup — just Supabase's built-in email.
 * Supabase sends a link that redirects back to `redirectTo` with a code, which
 * `detectSessionInUrl` then exchanges for a session.
 */
export async function signInWithMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
      shouldCreateUser: true,
    },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
