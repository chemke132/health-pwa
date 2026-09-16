/**
 * Dependency-free SVG line chart. Pass `data` as [{ label, value }] sorted
 * oldest → newest. Renders a responsive line with an area fill, min/max guides
 * and a highlighted latest point. Themed via the `brand` color.
 */
export default function TrendChart({ data, unit = '', height = 140 }) {
  if (!data || data.length < 2) return null;

  const W = 320;
  const H = height;
  const padX = 10;
  const padY = 16;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const x = (i) => padX + (i * (W - padX * 2)) / (data.length - 1);
  const y = (v) => padY + (1 - (v - min) / range) * (H - padY * 2);

  const points = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const areaPath =
    `M ${x(0)},${H - padY} ` +
    data.map((d, i) => `L ${x(i)},${y(d.value)}`).join(' ') +
    ` L ${x(data.length - 1)},${H - padY} Z`;

  const last = data[data.length - 1];

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`trend chart, latest ${last.value}${unit}`}
      >
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand, #0ea5e9)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--brand, #0ea5e9)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#trendFill)" />
        <polyline
          points={points}
          fill="none"
          stroke="var(--brand, #0ea5e9)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* latest point */}
        <circle cx={x(data.length - 1)} cy={y(last.value)} r="3.5" fill="var(--brand, #0ea5e9)" />
      </svg>

      <div className="flex justify-between text-[11px] text-slate-400 mt-1 px-1">
        <span>{data[0].label}</span>
        <span className="font-semibold text-slate-500 dark:text-slate-300">
          {last.value}
          {unit}
        </span>
        <span>{last.label}</span>
      </div>
    </div>
  );
}
