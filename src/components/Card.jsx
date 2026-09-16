export default function Card({ title, children, className = '' }) {
  return (
    <section
      className={`rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 md:p-5 shadow-sm ${className}`}
    >
      {title && (
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
