import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { signInWithGoogle, signInWithMagicLink } from '../lib/supabase';
import LanguageToggle from '../components/LanguageToggle';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleMagicLink = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setError(t('auth.invalidEmail'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signInWithMagicLink(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-6">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-sm text-center space-y-6">
        <div className="space-y-2">
          <div className="text-5xl">💪</div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">
            {t('app.title')}
          </h1>
          <p className="text-sm text-slate-400">{t('auth.welcome')}</p>
        </div>

        {sent ? (
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 p-4 text-sm text-emerald-700 dark:text-emerald-300">
            📧 {t('auth.magicLinkSent')}
          </div>
        ) : (
          <>
            {/* Email magic link (no external OAuth setup needed) */}
            <form onSubmit={handleMagicLink} className="space-y-3">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-2xl bg-brand text-white font-bold py-3 shadow-lg shadow-brand/30 disabled:opacity-60 transition"
              >
                {busy ? t('auth.sending') : t('auth.sendMagicLink')}
              </button>
            </form>

            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              {t('auth.or')}
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold py-3 text-slate-700 dark:text-slate-200 disabled:opacity-60 transition"
            >
              {t('auth.signInGoogle')}
            </button>
          </>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
