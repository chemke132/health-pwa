import { useTranslation } from 'react-i18next';

/**
 * KO / EN toggle. Shared by the mobile Header and the desktop Sidebar.
 * Persists via i18next's localStorage detector.
 */
export default function LanguageToggle({ className = '' }) {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage?.startsWith('ko') ? 'ko' : 'en';

  const setLang = (lng) => i18n.changeLanguage(lng);

  return (
    <div
      className={`inline-flex items-center rounded-full bg-slate-200/70 dark:bg-slate-700/70 p-0.5 text-xs font-semibold ${className}`}
      role="group"
      aria-label="Language"
    >
      {['ko', 'en'].map((lng) => {
        const active = current === lng;
        return (
          <button
            key={lng}
            type="button"
            onClick={() => setLang(lng)}
            aria-pressed={active}
            className={`px-3 py-1 rounded-full transition-colors ${
              active
                ? 'bg-white dark:bg-slate-900 text-brand-fg dark:text-brand shadow'
                : 'text-slate-500 dark:text-slate-300'
            }`}
          >
            {lng.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
