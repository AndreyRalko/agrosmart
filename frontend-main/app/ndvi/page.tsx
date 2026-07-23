'use client';

import { useState, useEffect, useRef } from 'react';
import { getFields } from '@/lib/api/field/field';
import type { Field } from '@/lib/types/field/field';

const SOURCES = ['Sentinel-2', 'Landsat', 'Дроны'] as const;
type Source = typeof SOURCES[number];
const TABS = ['Дашборд', 'Карта', 'Поля', 'Карточка', 'Загрузка', 'AI'] as const;
type Tab = typeof TABS[number];

const RECOMMENDATIONS = [
  { id: 1, title: 'Локальный полив проблемной зоны', field: 'Поле №2', description: 'Снижение NDVI на восточной части поля — вероятен дефицит влаги', priority: 'Высокий' },
  { id: 2, title: 'Дифференцированное внесение удобрений (N)', field: 'Поле №2', description: 'Признаки возможного дефицита азота в центральной зоне', priority: 'Средний' },
  { id: 3, title: 'Агрохимический анализ почвы', field: 'Поле №3', description: 'Отсутствие прироста NDVI за 2 недели', priority: 'Средний' },
  { id: 4, title: 'Обследование северной границы', field: 'Поле №1', description: 'Незначительная зона неравномерного развития', priority: 'Низкий' },
];

const MOCK_FIELDS = [
  { id: 1, no: '1', name: 'Поле №1', culture: 'Озимая пшеница', square: 124.5, ndvi: 0.78, ndviOld: 0.42, trend: 'up', risk: 'Низкий', source: 'sentinel-2', updated: '2026-05-22' },
  { id: 2, no: '2', name: 'Поле №2', culture: 'Подсолнечник', square: 87.3, ndvi: 0.52, ndviOld: 0.38, trend: 'down', risk: 'Высокий', source: 'drone', updated: '2026-05-22' },
  { id: 3, no: '3', name: 'Поле №3', culture: 'Кукуруза', square: 156, ndvi: 0.65, ndviOld: 0.45, trend: 'stable', risk: 'Средний', source: 'landsat', updated: '2026-05-21' },
  { id: 4, no: '4', name: 'Поле №4', culture: 'Соя', square: 92.7, ndvi: 0.71, ndviOld: 0.51, trend: 'up', risk: 'Низкий', source: 'sentinel-2', updated: '2026-05-22' },
];

const MOCK_NDVI: Record<number, number> = { 1: 0.78, 2: 0.52, 3: 0.65, 4: 0.71 };
const MOCK_NDVI_OLD: Record<number, number> = { 1: 0.42, 2: 0.38, 3: 0.45, 4: 0.51 };

const NDVI_HISTORY: Record<number, { date: string; value: number }[]> = {
  1: [{ date: '01.04', value: 0.35 }, { date: '15.04', value: 0.48 }, { date: '01.05', value: 0.62 }, { date: '15.05', value: 0.71 }, { date: '22.05', value: 0.78 }],
  2: [{ date: '01.04', value: 0.55 }, { date: '15.04', value: 0.58 }, { date: '01.05', value: 0.54 }, { date: '15.05', value: 0.52 }, { date: '22.05', value: 0.52 }],
  3: [{ date: '01.04', value: 0.42 }, { date: '15.04', value: 0.51 }, { date: '01.05', value: 0.58 }, { date: '15.05', value: 0.63 }, { date: '22.05', value: 0.65 }],
  4: [{ date: '01.04', value: 0.44 }, { date: '15.04', value: 0.55 }, { date: '01.05', value: 0.62 }, { date: '15.05', value: 0.68 }, { date: '22.05', value: 0.71 }],
};

function getNdviColor(ndvi: number | null): string {
  if (ndvi === null) return '#1e293b';
  if (ndvi >= 0.7) return '#16a34a';
  if (ndvi >= 0.55) return '#4ade80';
  if (ndvi >= 0.4) return '#f59e0b';
  return '#ef4444';
}
function getNdviDot(ndvi: number): string {
  if (ndvi >= 0.7) return '#16a34a';
  if (ndvi >= 0.55) return '#f59e0b';
  if (ndvi >= 0.4) return '#f59e0b';
  return '#ef4444';
}
function getNdviGlow(ndvi: number | null): string {
  if (ndvi === null) return 'none';
  if (ndvi >= 0.7) return '0 0 20px 6px rgba(22,163,74,0.2)';
  if (ndvi >= 0.55) return '0 0 20px 6px rgba(74,222,128,0.15)';
  if (ndvi >= 0.4) return '0 0 24px 8px rgba(245,158,11,0.35)';
  return '0 0 24px 8px rgba(239,68,68,0.4)';
}

// Custom slider
function RangeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const calc = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return value;
    return Math.round(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 100);
  };
  const onMouseDown = (e: React.MouseEvent) => {
    onChange(calc(e.clientX));
    const onMove = (ev: MouseEvent) => onChange(calc(ev.clientX));
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  const onTouchStart = (e: React.TouchEvent) => {
    const onMove = (ev: TouchEvent) => onChange(calc(ev.touches[0].clientX));
    const onEnd = () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd); };
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
    onChange(calc(e.touches[0].clientX));
  };
  return (
    <div ref={trackRef} className="relative w-full h-6 flex items-center cursor-pointer select-none" onMouseDown={onMouseDown} onTouchStart={onTouchStart}>
      <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: '#e5e7eb' }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: '#16a34a' }} />
      </div>
      <div className="absolute flex items-center justify-center" style={{ left: `calc(${value}% - 11px)`, width: 22, height: 22, borderRadius: '50%', backgroundColor: '#16a34a', border: '3px solid #fff', boxShadow: '0 0 0 2px #16a34a, 0 2px 8px rgba(0,0,0,0.25)', cursor: 'grab' }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 2, height: 8, backgroundColor: '#fff', borderRadius: 1, opacity: 0.7 }} />)}
        </div>
      </div>
    </div>
  );
}

// Mini SVG chart
function NdviChart({ data }: { data: { date: string; value: number }[] }) {
  const w = 380, h = 160, pad = 32;
  const minV = 0.3, maxV = 0.9;
  const xs = data.map((_, i) => pad + (i / (data.length - 1)) * (w - pad * 2));
  const ys = data.map(d => h - pad - ((d.value - minV) / (maxV - minV)) * (h - pad * 2));
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ');
  const area = `${path} L${xs[xs.length-1]},${h-pad} L${xs[0]},${h-pad} Z`;
  const gridLines = [0.3, 0.5, 0.7, 0.9];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ overflow: 'visible' }}>
      {gridLines.map(v => {
        const y = h - pad - ((v - minV) / (maxV - minV)) * (h - pad * 2);
        return (
          <g key={v}>
            <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#f1f5f9" strokeWidth={1} />
            <text x={pad - 4} y={y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">{v}</text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="ndviGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16a34a" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#ndviGrad)" />
      <path d={path} fill="none" stroke="#16a34a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={xs[i]} cy={ys[i]} r={4} fill="#16a34a" stroke="#fff" strokeWidth={2} />
          <text x={xs[i]} y={h - 8} textAnchor="middle" fontSize={10} fill="#94a3b8">{d.date}</text>
        </g>
      ))}
    </svg>
  );
}

export default function NdviPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Дашборд');
  const [activeSources, setActiveSources] = useState<Set<Source>>(new Set(['Sentinel-2']));
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [sliderValue, setSliderValue] = useState(100);
  const [heatmap, setHeatmap] = useState(true);
  const [compare, setCompare] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState(1);

  const sliderStartDate = new Date(); sliderStartDate.setDate(sliderStartDate.getDate() - 60);
  const sliderEndDate = new Date();
  const getSliderDate = (v: number) => new Date(sliderStartDate.getTime() + (v / 100) * (sliderEndDate.getTime() - sliderStartDate.getTime()));
  const sliderDateStr = getSliderDate(sliderValue).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const sliderLabels = Array.from({ length: 5 }, (_, i) => getSliderDate(i * 25).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }));

  useEffect(() => {
    getFields().then(res => setFields(res.results || [])).catch(() => setFields([])).finally(() => setLoading(false));
  }, []);

  const toggleSource = (source: Source) => {
    setActiveSources(prev => { const next = new Set(prev); if (next.has(source)) { if (next.size > 1) next.delete(source); } else next.add(source); return next; });
  };

  const today = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const mockFields = fields.length > 0 ? fields : MOCK_FIELDS.map(f => ({ id: f.id, no: f.no, square: f.square } as Field));

  const renderFieldCard = (field: Field, ndviData: Record<number, number>) => {
    const ndvi = heatmap ? (ndviData[field.id] ?? null) : null;
    const color = getNdviColor(ndvi);
    const glow = heatmap ? getNdviGlow(ndvi) : 'none';
    const isStress = heatmap && ndvi !== null && ndvi < 0.55;
    return (
      <div key={field.id} className="rounded-lg flex flex-col items-center justify-center p-4 relative cursor-pointer transition-transform hover:scale-105"
        style={{ backgroundColor: color, minHeight: '130px', boxShadow: glow, opacity: 0.92, border: heatmap ? 'none' : '1px solid rgba(255,255,255,0.15)' }}>
        {isStress && <div className="absolute inset-0 rounded-lg" style={{ background: 'radial-gradient(circle at 60% 40%, rgba(239,68,68,0.4) 0%, transparent 60%)' }} />}
        <p className="text-white font-semibold text-sm relative z-10">Поле №{field.no}</p>
        {heatmap && ndvi !== null ? <p className="text-white text-xs opacity-80 relative z-10 mt-1">NDVI {ndvi}</p> : <p className="text-white text-xs opacity-50 relative z-10 mt-1">Нет данных</p>}
      </div>
    );
  };

  // ---- Вкладка Поля ----
  const renderFieldsTab = () => (
    <div className="bg-white border border-neutral-200 p-5">
      <h2 className="text-base font-semibold text-neutral-900 mb-4">Поля под мониторингом</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-100">
            {['Поле', 'Культура', 'Площадь, га', 'NDVI', 'Динамика', 'Риск', 'Источник', 'Обновлено', ''].map(h => (
              <th key={h} className="text-left py-2 px-3 text-xs font-medium text-neutral-400 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MOCK_FIELDS.map(f => (
            <tr key={f.id} className="border-b border-neutral-50 hover:bg-neutral-50 cursor-pointer transition-colors"
              onClick={() => { setSelectedFieldId(f.id); setActiveTab('Карточка'); }}>
              <td className="py-3 px-3 font-semibold text-neutral-900">{f.name}</td>
              <td className="py-3 px-3 text-neutral-600">{f.culture}</td>
              <td className="py-3 px-3 text-neutral-600">{f.square}</td>
              <td className="py-3 px-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getNdviDot(f.ndvi) }} />
                  <span className="font-medium text-neutral-900">{f.ndvi}</span>
                </div>
              </td>
              <td className="py-3 px-3">
                {f.trend === 'up' && <span style={{ color: '#16a34a' }}>↗</span>}
                {f.trend === 'down' && <span style={{ color: '#ef4444' }}>↘</span>}
                {f.trend === 'stable' && <span style={{ color: '#6b7280' }}>~</span>}
              </td>
              <td className="py-3 px-3">
                <span className="px-2 py-0.5 text-xs font-medium rounded-full"
                  style={f.risk === 'Высокий' ? { backgroundColor: '#ef4444', color: '#fff' } : f.risk === 'Средний' ? { backgroundColor: '#16a34a', color: '#fff' } : { backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}>
                  {f.risk}
                </span>
              </td>
              <td className="py-3 px-3 text-neutral-400 text-xs">{f.source}</td>
              <td className="py-3 px-3 text-neutral-400 text-xs">{f.updated}</td>
              <td className="py-3 px-3 text-neutral-300">›</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ---- Вкладка Карточка ----
  const renderCardTab = () => {
    const f = MOCK_FIELDS.find(f => f.id === selectedFieldId) ?? MOCK_FIELDS[0];
    const history = NDVI_HISTORY[f.id] ?? [];
    const trend = f.trend === 'up' ? '↑ растёт' : f.trend === 'down' ? '↓ падает' : '→ стабильно';
    const trendColor = f.trend === 'up' ? '#16a34a' : f.trend === 'down' ? '#ef4444' : '#6b7280';

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-white border border-neutral-200 p-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">{f.name} — {f.culture}</h2>
            <p className="text-xs text-neutral-400 mt-0.5">{f.square} га · обновлено {f.updated} · источник: {f.source}</p>
          </div>
          <select className="px-3 py-1.5 text-sm border border-neutral-200 text-neutral-700 bg-white focus:outline-none"
            value={selectedFieldId} onChange={e => setSelectedFieldId(Number(e.target.value))}>
            {MOCK_FIELDS.map(mf => <option key={mf.id} value={mf.id}>{mf.name}</option>)}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Средний NDVI', value: String(f.ndvi), sub: trend, subColor: trendColor },
            { label: 'Проблемных зон', value: f.risk === 'Высокий' ? '3' : f.risk === 'Средний' ? '1' : '0', sub: f.risk === 'Высокий' ? '12.5 га' : f.risk === 'Средний' ? '3.2 га' : '—' },
            { label: 'Уровень риска', value: f.risk, sub: 'По AI-оценке' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-neutral-200 p-4">
              <p className="text-xs text-neutral-400 mb-2">{s.label}</p>
              <p className="text-2xl font-bold text-neutral-900 mb-0.5">{s.value}</p>
              <p className="text-xs" style={{ color: s.subColor ?? '#94a3b8' }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Chart + Map */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-neutral-200 p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">История NDVI</h3>
            <NdviChart data={history} />
          </div>
          <div className="bg-white border border-neutral-200 p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 13l4.553 2.276A1 1 0 0021 21.382V10.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 4" /></svg>
              Карта проблемных зон
            </h3>
            <div className="rounded-lg p-4 relative" style={{ backgroundColor: '#0f172a', minHeight: '220px' }}>
              <div className="absolute top-3 right-3 text-xs px-2 py-1 rounded" style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}>📅 22.05.2026</div>
              <div className="flex items-center justify-center h-full py-6">
                <div className="rounded-lg flex flex-col items-center justify-center p-6 relative"
                  style={{ backgroundColor: getNdviColor(f.ndvi), minHeight: '140px', minWidth: '160px', boxShadow: getNdviGlow(f.ndvi) }}>
                  {f.ndvi < 0.65 && <div className="absolute inset-0 rounded-lg" style={{ background: 'radial-gradient(circle at 60% 40%, rgba(239,68,68,0.35) 0%, transparent 60%)' }} />}
                  <p className="text-white font-semibold text-sm relative z-10">{f.name}</p>
                  <p className="text-white text-xs opacity-80 relative z-10 mt-1">NDVI {f.ndvi}</p>
                </div>
              </div>
              <div className="absolute bottom-3 left-3 p-2.5 rounded-lg text-xs space-y-1" style={{ backgroundColor: 'rgba(15,23,42,0.92)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-white font-medium mb-1.5">NDVI</p>
                {[{ color: '#16a34a', label: '0.7–1.0 отлично' }, { color: '#4ade80', label: '0.55–0.7 хорошо' }, { color: '#f59e0b', label: '0.4–0.55 стресс' }, { color: '#ef4444', label: '<0.4 риск' }].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span style={{ color: '#cbd5e1' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* AI + Рекомендации */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-neutral-200 p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              AI-анализ
            </h3>
            <div className="space-y-2 mb-4">
              {[
                f.trend === 'up' ? 'Поле развивается равномерно, NDVI растёт стабильно' : f.trend === 'down' ? 'Наблюдается снижение NDVI, требуется обследование' : 'NDVI стабилен, изменений не выявлено',
                f.risk !== 'Низкий' ? `Незначительная зона снижения NDVI на северном крае (3.2 га)` : 'Проблемных зон не выявлено',
                'Рекомендуется плановое обследование',
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-neutral-600">
                  <span style={{ color: '#16a34a' }}>✦</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
            {f.risk !== 'Низкий' && (
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Зоны риска</p>
                <div className="border border-neutral-200 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Северный край</p>
                    <p className="text-xs text-neutral-400">Неравномерность развития · 3.2 га · NDVI 0.58</p>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ backgroundColor: '#f59e0b', color: '#fff' }}>Средний</span>
                </div>
              </div>
            )}
          </div>
          <div className="bg-white border border-neutral-200 p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Рекомендуемые агрооперации
            </h3>
            <div className="border border-neutral-200 p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-medium text-neutral-900">Обследование северной границы</p>
                <span className="text-xs border border-neutral-200 px-1.5 py-0.5 text-neutral-500 shrink-0">Низкий</span>
              </div>
              <p className="text-xs text-neutral-400 mb-3">Незначительная зона неравномерного развития</p>
              <div className="flex items-center justify-end gap-2">
                <button className="p-1.5 text-neutral-400 hover:text-neutral-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </button>
                <button className="px-3 py-1.5 text-xs font-medium text-white" style={{ backgroundColor: '#171717' }}>
                  Принять → Агрооперация
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ---- Карта ----
  const renderMapTab = () => (
    <div className="bg-white border border-neutral-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 13l4.553 2.276A1 1 0 0021 21.382V10.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 4" /></svg>
          Карта NDVI-мониторинга
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setHeatmap(h => !h)} className="px-4 py-1.5 text-xs font-medium border transition-colors"
            style={heatmap ? { backgroundColor: '#16a34a', color: '#fff', borderColor: '#16a34a' } : { backgroundColor: '#fff', color: '#525252', borderColor: '#e5e7eb' }}>
            Heatmap
          </button>
          <button onClick={() => setCompare(c => !c)} className="px-4 py-1.5 text-xs font-medium border transition-colors"
            style={compare ? { backgroundColor: '#171717', color: '#fff', borderColor: '#171717' } : { backgroundColor: '#fff', color: '#525252', borderColor: '#e5e7eb' }}>
            Сравнение
          </button>
        </div>
      </div>

      {compare ? (
        <div className="grid grid-cols-2 gap-4">
          {[{ label: 'Снимок А: ' + sliderLabels[0], date: sliderLabels[0] + ' 2026', data: MOCK_NDVI_OLD }, { label: 'Снимок Б: ' + sliderDateStr.slice(0, 5), date: sliderDateStr, data: MOCK_NDVI }].map((panel, pi) => (
            <div key={pi}>
              <p className="text-xs text-neutral-400 mb-2">{panel.label}</p>
              <div className="rounded-lg p-4 relative" style={{ backgroundColor: '#0f172a', minHeight: '300px' }}>
                <div className="absolute top-3 right-3 text-xs px-2 py-1 rounded" style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}>📅 {panel.date}</div>
                <div className="flex items-center justify-center h-full py-6">
                  <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(mockFields.length, 3)}, minmax(90px, 130px))` }}>
                    {mockFields.map(f => renderFieldCard(f, panel.data))}
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 p-2.5 rounded-lg text-xs space-y-1" style={{ backgroundColor: 'rgba(15,23,42,0.92)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-white font-medium mb-1">NDVI</p>
                  {[{ color: '#16a34a', label: '0.7–1.0' }, { color: '#4ade80', label: '0.55–0.7' }, { color: '#f59e0b', label: '0.4–0.55' }, { color: '#ef4444', label: '<0.4' }].map(item => (
                    <div key={item.label} className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} /><span style={{ color: '#cbd5e1' }}>{item.label}</span></div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg p-6 relative" style={{ backgroundColor: '#0f172a', minHeight: '360px' }}>
          <div className="absolute top-4 right-4 text-xs px-2 py-1 rounded" style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}>📅 {sliderDateStr}</div>
          {loading ? <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" /></div> : (
            <div className="flex items-center justify-center h-full py-8">
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(mockFields.length, 3)}, minmax(140px, 180px))` }}>
                {mockFields.map(f => renderFieldCard(f, MOCK_NDVI))}
              </div>
            </div>
          )}
          <div className="absolute bottom-4 left-4 p-3 rounded-lg text-xs space-y-1.5" style={{ backgroundColor: 'rgba(15,23,42,0.92)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-white font-medium mb-2">NDVI</p>
            {[{ color: '#16a34a', label: '0.7 — 1.0 отлично' }, { color: '#4ade80', label: '0.55 — 0.7 хорошо' }, { color: '#f59e0b', label: '0.4 — 0.55 стресс' }, { color: '#ef4444', label: '< 0.4 риск' }].map(item => (
              <div key={item.label} className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color }} /><span style={{ color: '#cbd5e1' }}>{item.label}</span></div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-neutral-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-neutral-500 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Временной слайдер
          </span>
          <span className="text-xs font-medium text-neutral-700">{sliderDateStr}</span>
        </div>
        <RangeSlider value={sliderValue} onChange={setSliderValue} />
        <div className="flex justify-between mt-2">
          {sliderLabels.map(d => <span key={d} className="text-xs text-neutral-400">{d}</span>)}
        </div>
      </div>
    </div>
  );

  // ---- Вкладка Загрузка ----
  const renderUploadTab = () => {
    const UPLOAD_HISTORY = [
      { name: 'field2_orthomosaic_2026-05-22.tif', type: 'GeoTIFF', size: '284 МБ', date: '2026-05-22', ndvi: 0.52 },
      { name: 'field3_ndvi.shp', type: 'Shapefile', size: '12 МБ', date: '2026-05-21', ndvi: 0.65 },
    ];
    return (
      <div className="space-y-4">
        <div className="bg-white border border-neutral-200 p-5">
          <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2 mb-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            Загрузка данных с дронов
          </h2>
          <p className="text-xs text-neutral-400 mb-4">GeoTIFF · TIFF · orthomosaic · NDVI raster · SHP · GeoJSON</p>
          <div className="border-2 border-dashed border-neutral-200 rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer hover:border-neutral-300 transition-colors">
            <svg className="w-10 h-10 text-neutral-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="text-sm font-medium text-neutral-700 mb-1">Перетащите файлы сюда или нажмите для выбора</p>
            <p className="text-xs text-neutral-400">.tif, .tiff, .shp, .geojson — до 500 МБ</p>
          </div>
        </div>
        <div className="bg-white border border-neutral-200 p-5">
          <h3 className="text-sm font-semibold text-neutral-900 mb-3">История загрузок</h3>
          <div className="space-y-2">
            {UPLOAD_HISTORY.map(f => (
              <div key={f.name} className="flex items-center justify-between p-3 border border-neutral-100 hover:bg-neutral-50 transition-colors">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-neutral-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{f.name}</p>
                    <p className="text-xs text-neutral-400">{f.type} · {f.size} · {f.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#16a34a' }} />
                  <span className="text-xs font-medium text-neutral-600">NDVI {f.ndvi}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ---- Дашборд ----
  const renderDashboard = () => (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 bg-white border border-neutral-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">Состояние полей</h2>
          <span className="text-xs text-neutral-400">{today}</span>
        </div>
        {loading ? <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neutral-900" /></div>
          : fields.length === 0 ? <div className="flex items-center justify-center h-48"><p className="text-sm text-neutral-400">Нет полей</p></div>
          : <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(fields.length, 3)}, 1fr)` }}>
            {fields.map(field => (
              <div key={field.id} className="border border-neutral-200 p-4 flex flex-col gap-1 hover:bg-neutral-50 transition-colors cursor-pointer" style={{ minHeight: '100px' }}>
                <p className="text-sm font-medium text-neutral-900">Поле №{field.no}</p>
                {field.square && <p className="text-xs text-neutral-500">{field.square} га</p>}
                <div className="mt-auto flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#e5e7eb' }} />
                  <span className="text-xs text-neutral-400">Нет данных</span>
                </div>
              </div>
            ))}
          </div>}
        <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-wrap gap-3">
          {[{ color: '#16a34a', label: '≥0.7 отлично' }, { color: '#4ade80', label: '0.55–0.7 хорошо' }, { color: '#f59e0b', label: '0.4–0.55 стресс' }, { color: '#ef4444', label: '<0.4 риск' }, { color: '#e5e7eb', label: 'Нет данных' }].map(item => (
            <div key={item.label} className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm border border-neutral-200" style={{ backgroundColor: item.color }} /><span className="text-xs text-neutral-500">{item.label}</span></div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-2 bg-white border border-neutral-200 p-5">
        <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide mb-4">AI-рекомендации</h2>
        <div className="space-y-3">
          {RECOMMENDATIONS.map(rec => (
            <div key={rec.id} className="p-3 border border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-neutral-900 leading-snug">{rec.title}</p>
                <span className="shrink-0 text-xs text-neutral-500 border border-neutral-200 px-1.5 py-0.5">{rec.priority}</span>
              </div>
              <p className="text-xs text-neutral-500 mb-0.5">{rec.field}</p>
              <p className="text-xs text-neutral-400">{rec.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">NDVI-мониторинг</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Спутниковая и дрон-аналитика состояния полей</p>
        </div>
        <div className="flex items-center gap-2">
          {SOURCES.map(source => (
            <span key={source} className="px-3 py-1.5 text-xs font-medium rounded-full"
              style={{ backgroundColor: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
              ✦ {source}
            </span>
          ))}
        </div>
      </div>

      <div className="flex border-b border-neutral-200 mb-6 bg-white overflow-hidden">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className="px-5 py-3 text-sm font-medium transition-colors border-b-2"
            style={activeTab === tab ? { borderColor: '#171717', color: '#171717' } : { borderColor: 'transparent', color: '#6b7280' }}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Дашборд' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[{ label: 'Средний NDVI', value: '—', sub: 'Данные не загружены' }, { label: 'Всего полей', value: loading ? '...' : String(fields.length || MOCK_FIELDS.length), sub: 'активных' }, { label: 'AI-аномалии', value: '4', sub: 'Зон риска обнаружено' }, { label: 'Рекомендации', value: '4', sub: 'Ожидают решения' }].map(stat => (
            <div key={stat.label} className="bg-white border border-neutral-200 p-4">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">{stat.label}</p>
              <p className="text-3xl font-bold text-neutral-900 mb-0.5">{stat.value}</p>
              <p className="text-xs text-neutral-400">{stat.sub}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Дашборд' && renderDashboard()}
      {activeTab === 'Карта' && renderMapTab()}
      {activeTab === 'Поля' && renderFieldsTab()}
      {activeTab === 'Карточка' && renderCardTab()}
      {activeTab === 'Загрузка' && renderUploadTab()}
      {activeTab === 'AI' && (
        <div className="bg-white border border-neutral-200 p-8 text-center text-sm text-neutral-400">
          Раздел «AI» в разработке
        </div>
      )}
    </div>
  );
}