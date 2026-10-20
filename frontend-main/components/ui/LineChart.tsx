interface Point {
  t: number;   // время, мс
  v: number;
}

interface LineChartProps {
  title: string;
  unit: string;
  color: string;
  points: Point[];
  /** Пороговое значение (горизонтальная пунктирная линия). */
  threshold?: number;
}

const W = 420;
const H = 170;
const PAD_L = 36;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 24;

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

/** Простой SVG-график: в проекте нет графической библиотеки. */
export default function LineChart({ title, unit, color, points, threshold }: LineChartProps) {
  if (points.length === 0) {
    return (
      <div className="bg-white border border-neutral-200 p-4">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">{title}</p>
        <p className="text-sm text-neutral-400">Нет данных для графика</p>
      </div>
    );
  }

  const values = points.map(p => p.v).concat(threshold !== undefined ? [threshold] : []);
  let minV = Math.min(...values);
  let maxV = Math.max(...values);
  if (minV === maxV) { minV -= 1; maxV += 1; }
  const minT = points[0].t;
  const maxT = points[points.length - 1].t;
  const spanT = maxT - minT || 1;

  const x = (t: number) => points.length === 1 ? (PAD_L + W - PAD_R) / 2 : PAD_L + ((t - minT) / spanT) * (W - PAD_L - PAD_R);
  const y = (v: number) => PAD_T + (1 - (v - minV) / (maxV - minV)) * (H - PAD_T - PAD_B);

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const ticks = [minV, (minV + maxV) / 2, maxV];

  return (
    <div className="bg-white border border-neutral-200 p-4">
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">{title}, {unit}</p>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={title}>
        {ticks.map(v => (
          <g key={v}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)} stroke="#e5e5e5" strokeWidth={1} />
            <text x={PAD_L - 4} y={y(v) + 3} fontSize={9} textAnchor="end" fill="#737373">{v.toFixed(1)}</text>
          </g>
        ))}
        {threshold !== undefined && (
          <line x1={PAD_L} x2={W - PAD_R} y1={y(threshold)} y2={y(threshold)} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1} />
        )}
        <path d={path} fill="none" stroke={color} strokeWidth={1.75} />
        {points.length <= 60 && points.map(p => (
          <circle key={p.t} cx={x(p.t)} cy={y(p.v)} r={2} fill={color} />
        ))}
        <text x={PAD_L} y={H - 6} fontSize={9} fill="#737373">{fmtTime(minT)}</text>
        <text x={W - PAD_R} y={H - 6} fontSize={9} textAnchor="end" fill="#737373">{fmtTime(maxT)}</text>
      </svg>
    </div>
  );
}
