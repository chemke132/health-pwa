export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand"
    />
  );
}

/** Primary/secondary action buttons row for forms. */
export function FormActions({ onCancel, saving, cancelLabel, saveLabel }) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        disabled={saving}
        className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-bold text-white shadow shadow-brand/30 disabled:opacity-60"
      >
        {saving ? '…' : saveLabel}
      </button>
    </div>
  );
}
