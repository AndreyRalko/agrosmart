interface BarItem {
  label: string;
  value: number;
}

interface BarChartProps {
  title: string;
  items: BarItem[];
  color?: string;
  formatValue?: (v: number) => string;
  emptyText?: string;
}

const W = 420;
const H = 200;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 18;
const PAD_B = 34;

function shorten(s: string, max = 12): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Вертикальные столбцы на SVG: в проекте нет графической библиотеки. */
export default function BarChart({
  title, items, color = '#171717', formatValue = v => v.toLocaleString('ru-RU', { maximumFractionDigits: 1 }),
  emptyText = 'Нет данных для графика',
}: BarChartProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white border border-neutral-200 p-4">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">{title}</p>
        <p className="text-sm text-neutral-400">{emptyText}</p>
      </div>
    );
  }

  const max = Math.max(...items.map(i => i.value), 0) || 1;
  const slot = (W - PAD_L - PAD_R) / items.length;
  const barW = Math.min(48, slot * 0.6);
  const plotH = H - PAD_T - PAD_B;

  return (
    <div className="bg-white border border-neutral-200 p-4">
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">{title}</p>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={title}>
        <line x1={PAD_L} x2={W - PAD_R} y1={H - PAD_B} y2={H - PAD_B} stroke="#d4d4d4" />
        {items.map((item, i) => {
          const h = Math.max(0, (item.value / max) * plotH);
          const cx = PAD_L + slot * i + slot / 2;
          return (
            <g key={`${item.label}-${i}`}>
              <title>{`${item.label}: ${formatValue(item.value)}`}</title>
              <rect x={cx - barW / 2} y={H - PAD_B - h} width={barW} height={h} fill={color} />
              <text x={cx} y={H - PAD_B - h - 4} fontSize={9} textAnchor="middle" fill="#404040">
                {formatValue(item.value)}
              </text>
              <text x={cx} y={H - PAD_B + 13} fontSize={9} textAnchor="middle" fill="#737373">
                {shorten(item.label, Math.max(6, Math.floor(slot / 5.5)))}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
