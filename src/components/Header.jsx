import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { formatHeaderDate } from '../lib/timezone';
import LanguageToggle from './LanguageToggle';

/** Mobile-only top bar: current date + language toggle. Hidden on md+. */
export default function Header() {
  const { t, i18n } = useTranslation();
  const currentDate = useAppStore((s) => s.currentDate);
  const locale = i18n.resolvedLanguage?.startsWith('ko') ? 'ko' : 'en';

  return (
    <header className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div className="flex flex-col leading-tight">
        <span className="text-[11px] uppercase tracking-wide text-slate-400">
          {t('common.today')}
        </span>
        <span className="text-base font-bold text-slate-800 dark:text-slate-100">
          {formatHeaderDate(currentDate, locale)}
        </span>
      </div>
      <LanguageToggle />
    </header>
  );
}
