import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NAV_ITEMS } from './navItems';
import LanguageToggle from './LanguageToggle';
import UnitToggle from './UnitToggle';
import { useAppStore } from '../store/useAppStore';
import { signOut } from '../lib/supabase';

/** Desktop-only left sidebar (>= md). Hidden on mobile. */
export default function DesktopSidebar() {
  const { t } = useTranslation();
  const user = useAppStore((s) => s.user);

  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 h-screen sticky top-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-6">
      <div className="flex items-center gap-2 px-2 mb-8">
        <span className="text-2xl">💪</span>
        <span className="text-lg font-black text-slate-800 dark:text-slate-100">
          {t('app.title')}
        </span>
      </div>

      <nav className="flex-1">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-brand/15 text-brand-fg dark:text-brand'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`
                }
              >
                <span className="text-lg">{item.icon}</span>
                {t(item.labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto space-y-4 px-1">
        <div className="flex gap-2">
          <LanguageToggle className="flex-1 justify-center" />
          <UnitToggle className="flex-1 justify-center" />
        </div>
        {user && (
          <div className="text-xs text-slate-400 truncate" title={user.email}>
            {user.email}
          </div>
        )}
        <button
          type="button"
          onClick={() => signOut()}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {t('auth.signOut')}
        </button>
      </div>
    </aside>
  );
}
