interface PieItem {
  label: string;
  value: number;
}

interface PieChartProps {
  title: string;
  items: PieItem[];
  formatValue?: (v: number) => string;
  emptyText?: string;
  note?: string;
}

export const PIE_PALETTE = ['#171717', '#16a34a', '#2563eb', '#f59e0b', '#dc2626', '#a3a3a3'];

const R = 70;
const R_IN = 42;
const C = 80;

function arc(start: number, end: number): string {
  const p = (a: number, r: number) => [C + r * Math.sin(a), C - r * Math.cos(a)];
  const large = end - start > Math.PI ? 1 : 0;
  const [x1, y1] = p(start, R);
  const [x2, y2] = p(end, R);
  const [x3, y3] = p(end, R_IN);
  const [x4, y4] = p(start, R_IN);
  return `M${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${R_IN},${R_IN} 0 ${large} 0 ${x4},${y4} Z`;
}

/** Кольцевая диаграмма с легендой на SVG. */
export default function PieChart({
  title, items, formatValue = v => v.toLocaleString('ru-RU', { maximumFractionDigits: 1 }),
  emptyText = 'Нет данных для графика', note,
}: PieChartProps) {
  const total = items.reduce((s, i) => s + i.value, 0);

  if (items.length === 0 || total <= 0) {
    return (
      <div className="bg-white border border-neutral-200 p-4">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">{title}</p>
        <p className="text-sm text-neutral-400">{emptyText}</p>
      </div>
    );
  }

  let angle = 0;
  const segments = items.map((item, i) => {
    const start = angle;
    // Полный круг одной дугой не рисуется — оставляем микрозазор.
    const sweep = Math.min((item.value / total) * Math.PI * 2, Math.PI * 2 - 0.0001);
    angle += sweep;
    return { ...item, d: arc(start, start + sweep), color: PIE_PALETTE[i % PIE_PALETTE.length] };
  });

  return (
    <div className="bg-white border border-neutral-200 p-4">
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <svg viewBox="0 0 160 160" width={160} height={160} role="img" aria-label={title} className="shrink-0">
          {segments.map(s => (
            <path key={s.label} d={s.d} fill={s.color}>
              <title>{`${s.label}: ${formatValue(s.value)}`}</title>
            </path>
          ))}
        </svg>
        <ul className="space-y-1.5 text-xs w-full">
          {segments.map(s => (
            <li key={s.label} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: s.color }} />
              <span className="flex-1 text-neutral-700 truncate" title={s.label}>{s.label}</span>
              <span className="text-neutral-900 whitespace-nowrap">{formatValue(s.value)}</span>
              <span className="text-neutral-400 w-10 text-right">{Math.round((s.value / total) * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>
      {note && <p className="text-xs text-neutral-400 mt-3">{note}</p>}
    </div>
  );
}
