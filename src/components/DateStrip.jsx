import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { shiftDateKey, isTodayKey, todayKey, formatHeaderDate } from '../lib/timezone';

/**
 * Date navigator. Moves the store's `currentDate` back/forward one day and lets
 * the user jump to today. "Next" is disabled on today (no future logging).
 * All pages read `currentDate` from the store, so they re-render automatically.
 */
export default function DateStrip() {
  const { t, i18n } = useTranslation();
  const currentDate = useAppStore((s) => s.currentDate);
  const setCurrentDate = useAppStore((s) => s.setCurrentDate);
  const locale = i18n.resolvedLanguage?.startsWith('ko') ? 'ko' : 'en';

  const atToday = isTodayKey(currentDate);

  const arrowClass =
    'h-9 w-9 grid place-items-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800';

  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <button
        type="button"
        onClick={() => setCurrentDate(shiftDateKey(currentDate, -1))}
        aria-label="Previous day"
        className={arrowClass}
      >
        ‹
      </button>

      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
        {formatHeaderDate(currentDate, locale)}
      </span>

      <div className="flex items-center gap-2">
        {!atToday && (
          <button
            type="button"
            onClick={() => setCurrentDate(todayKey())}
            className="rounded-full bg-brand/10 text-brand-fg dark:text-brand px-3 py-1.5 text-xs font-bold"
          >
            {t('common.today')}
          </button>
        )}
        <button
          type="button"
          disabled={atToday}
          onClick={() => setCurrentDate(shiftDateKey(currentDate, 1))}
          aria-label="Next day"
          className={`${arrowClass} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          ›
        </button>
      </div>
    </div>
  );
}
