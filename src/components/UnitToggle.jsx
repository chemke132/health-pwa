import { useAppStore } from '../store/useAppStore';

/**
 * Unit-system switch. One tap converts every weight AND height display:
 *   metric → kg / cm     imperial → lb / ft·in
 * Values are stored canonically (kg, cm); this only changes presentation.
 */
const OPTIONS = [
  { value: 'metric', label: 'kg·cm' },
  { value: 'imperial', label: 'lb·ft' },
];

export default function UnitToggle({ className = '' }) {
  const system = useAppStore((s) => s.unitSystem);
  const setSystem = useAppStore((s) => s.setUnitSystem);

  return (
    <div
      className={`inline-flex items-center rounded-full bg-slate-200/70 dark:bg-slate-700/70 p-0.5 text-xs font-semibold ${className}`}
      role="group"
      aria-label="Unit system"
    >
      {OPTIONS.map((o) => {
        const active = system === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => setSystem(o.value)}
            aria-pressed={active}
            className={`px-2.5 py-1 rounded-full transition-colors ${
              active
                ? 'bg-white dark:bg-slate-900 text-brand-fg dark:text-brand shadow'
                : 'text-slate-500 dark:text-slate-300'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
