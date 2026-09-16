import { useTranslation } from 'react-i18next';
import LanguageToggle from './LanguageToggle';

/** Mobile-only top bar: app title + language toggle. Hidden on md+. */
export default function Header() {
  const { t } = useTranslation();

  return (
    <header className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <span className="text-xl">💪</span>
        <span className="text-base font-black text-slate-800 dark:text-slate-100">
          {t('app.title')}
        </span>
      </div>
      <LanguageToggle />
    </header>
  );
}
