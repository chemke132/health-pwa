import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { NAV_ITEMS } from './navItems';
import { useKeyboardOpen } from '../hooks/useKeyboardOpen';

/**
 * Mobile bottom navigation. The active tab has a pill background that slides
 * between tabs using Framer Motion's shared `layoutId="bubble"`.
 * Hidden on md+ (desktop uses the sidebar).
 */
export default function BubbleTabBar() {
  const { t } = useTranslation();
  const location = useLocation();
  const keyboardOpen = useKeyboardOpen();

  const isActive = (item) =>
    item.end
      ? location.pathname === item.to
      : location.pathname.startsWith(item.to);

  return (
    <nav
      aria-hidden={keyboardOpen}
      className={`md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur transition-transform duration-200 ${
        keyboardOpen ? 'translate-y-full' : 'translate-y-0'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex items-stretch justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <li key={item.to} className="relative flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-semibold"
              >
                {active && (
                  <motion.span
                    layoutId="bubble"
                    className="absolute inset-0 rounded-2xl bg-brand/15 dark:bg-brand/25"
                    transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                  />
                )}
                <span
                  className={`relative text-lg leading-none transition-transform ${
                    active ? 'scale-110' : 'scale-100'
                  }`}
                >
                  {item.icon}
                </span>
                <span
                  className={`relative transition-colors ${
                    active
                      ? 'text-brand-fg dark:text-brand'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {t(item.labelKey)}
                </span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
