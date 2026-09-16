import { useAppStore } from '../store/useAppStore';

/**
 * kg / lb weight-unit switch. One tap converts every weight display in the app.
 * Values are stored in kg; this only changes presentation.
 */
export default function UnitToggle({ className = '' }) {
  const unit = useAppStore((s) => s.weightUnit);
  const setUnit = useAppStore((s) => s.setWeightUnit);

  return (
    <div
      className={`inline-flex items-center rounded-full bg-slate-200/70 dark:bg-slate-700/70 p-0.5 text-xs font-semibold ${className}`}
      role="group"
      aria-label="Weight unit"
    >
      {['kg', 'lb'].map((u) => {
        const active = unit === u;
        return (
          <button
            key={u}
            type="button"
            onClick={() => setUnit(u)}
            aria-pressed={active}
            className={`px-3 py-1 rounded-full transition-colors ${
              active
                ? 'bg-white dark:bg-slate-900 text-brand-fg dark:text-brand shadow'
                : 'text-slate-500 dark:text-slate-300'
            }`}
          >
            {u}
          </button>
        );
      })}
    </div>
  );
}
