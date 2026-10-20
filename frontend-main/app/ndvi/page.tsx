'use client';

import { useState, useEffect, useRef } from 'react';
import { getFields } from '@/lib/api/field/field';
import type { Field } from '@/lib/types/field/field';
import NdviFieldMap from '@/components/ndvi/NdviFieldMap';
import { getNdviHistory } from '@/lib/api/ndvi/ndvi';

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

function getNdviDot(ndvi: number): string {
  if (ndvi >= 0.7) return '#16a34a';
  if (ndvi >= 0.55) return '#f59e0b';
  if (ndvi >= 0.4) return '#f59e0b';
  return '#ef4444';
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
  if (data.length === 0) {
    return <p className="text-sm text-neutral-400 py-8 text-center">Нет наблюдений NDVI</p>;
  }
  const w = 380, h = 160, pad = 36;
  const values = data.map(d => d.value);
  const minV = Math.max(0, Math.min(...values) - 0.05);
  const maxV = Math.min(1, Math.max(...values) + 0.05);
  const span = Math.max(maxV - minV, 0.05);
  const xs = data.map((_, i) => pad + (data.length === 1 ? (w - pad * 2) / 2 : (i / (data.length - 1)) * (w - pad * 2)));
  const ys = data.map(d => h - pad - ((d.value - minV) / span) * (h - pad * 2));
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ');
  const area = `${path} L${xs[xs.length-1]},${h-pad} L${xs[0]},${h-pad} Z`;
  const gridLines = [minV, minV + span / 2, minV + span];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ overflow: 'visible' }}>
      {gridLines.map(v => {
        const y = h - pad - ((v - minV) / (maxV - minV)) * (h - pad * 2);
        return (
          <g key={v}>
            <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#f1f5f9" strokeWidth={1} />
            <text x={pad - 4} y={y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">{v.toFixed(2)}</text>
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
      {data.map((d, i) => {
        const month = Number(d.date.slice(3, 5));
        const summer = month >= 6 && month <= 8;
        return (
        <g key={i}>
          <circle cx={xs[i]} cy={ys[i]} r={4} fill={summer ? '#15803d' : '#16a34a'} stroke="#fff" strokeWidth={2} />
          <text x={xs[i]} y={h - 8} textAnchor="middle" fontSize={10} fill="#94a3b8">{d.date}</text>
        </g>
        );
      })}
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
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [historyPoints, setHistoryPoints] = useState<{ date: string; value: number; iso: string }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const sliderStartDate = new Date(); sliderStartDate.setDate(sliderStartDate.getDate() - 120);
  const sliderEndDate = new Date();
  const getSliderDate = (v: number) => new Date(sliderStartDate.getTime() + (v / 100) * (sliderEndDate.getTime() - sliderStartDate.getTime()));
  const toIsoDate = (value: Date) => {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  };
  const sliderDate = getSliderDate(sliderValue);
  const sliderDateStr = sliderDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const sliderDateIso = toIsoDate(sliderDate);
  const compareDateIso = toIsoDate(sliderStartDate);
  const sliderLabels = Array.from({ length: 5 }, (_, i) => getSliderDate(i * 25).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }));

  useEffect(() => {
    getFields().then(res => setFields(res.results || [])).catch(() => setFields([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (fields.length > 0 && !fields.some(field => field.id === selectedFieldId)) {
      setSelectedFieldId(fields[0].id);
    }
  }, [fields, selectedFieldId]);

  useEffect(() => {
    if (activeTab !== 'Карточка' || selectedFieldId == null) return;
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError('');
    getNdviHistory(selectedFieldId)
      .then((data) => {
        if (cancelled) return;
        setHistoryPoints(data.points.map((point) => ({
          iso: point.date,
          date: `${point.date.slice(8, 10)}.${point.date.slice(5, 7)}`,
          value: point.ndvi_mean,
        })));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setHistoryPoints([]);
        setHistoryError(err instanceof Error ? err.message : 'Не удалось загрузить историю NDVI');
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedFieldId]);

  const toggleSource = (source: Source) => {
    setActiveSources(prev => { const next = new Set(prev); if (next.has(source)) { if (next.size > 1) next.delete(source); } else next.add(source); return next; });
  };

  const today = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

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
    const field = fields.find(item => item.id === selectedFieldId) ?? fields[0];
    const latest = historyPoints[historyPoints.length - 1];
    const previous = historyPoints[historyPoints.length - 2];
    const delta = latest && previous ? latest.value - previous.value : 0;
    const trend = !latest ? 'нет данных' : !previous ? 'одно наблюдение' : delta > 0.02 ? '↑ растёт' : delta < -0.02 ? '↓ падает' : '→ стабильно';
    const trendColor = trend.startsWith('↑') ? '#16a34a' : trend.startsWith('↓') ? '#ef4444' : '#6b7280';
    const mapDate = latest?.iso ?? toIsoDate(new Date());

    if (!field) {
      return <div className="bg-white border border-neutral-200 p-8 text-sm text-neutral-400">Нет полей</div>;
    }

    return (
      <div className="space-y-4">
        <div className="bg-white border border-neutral-200 p-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Поле {field.no}</h2>
            <p className="text-xs text-neutral-400 mt-0.5">{field.square} га · Sentinel-2</p>
          </div>
          <select className="px-3 py-1.5 text-sm border border-neutral-200 text-neutral-700 bg-white focus:outline-none"
            value={field.id} onChange={e => setSelectedFieldId(Number(e.target.value))}>
            {fields.map(item => <option key={item.id} value={item.id}>Поле {item.no}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Средний NDVI', value: latest ? latest.value.toFixed(2) : '—', sub: trend, subColor: trendColor },
            { label: 'Наблюдений', value: String(historyPoints.length), sub: 'снимки Sentinel-2' },
            { label: 'Последний снимок', value: latest ? latest.date : '—', sub: latest ? latest.iso : 'данные из базы' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-neutral-200 p-4">
              <p className="text-xs text-neutral-400 mb-2">{s.label}</p>
              <p className="text-2xl font-bold text-neutral-900 mb-0.5">{s.value}</p>
              <p className="text-xs" style={{ color: s.subColor ?? '#94a3b8' }}>{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-neutral-200 p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">История NDVI</h3>
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neutral-900" />
              </div>
            ) : historyError ? (
              <p className="text-sm text-red-600">{historyError}</p>
            ) : (
              <NdviChart data={historyPoints} />
            )}
          </div>
          <div className="bg-white border border-neutral-200 p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 13l4.553 2.276A1 1 0 0021 21.382V10.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 4" /></svg>
              NDVI поля
            </h3>
            <NdviFieldMap fields={[field]} date={mapDate} showImages height={320} />
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
                trend.startsWith('↑') ? 'По снимкам Sentinel-2 NDVI растёт' : trend.startsWith('↓') ? 'По снимкам Sentinel-2 NDVI снижается' : 'По снимкам Sentinel-2 NDVI меняется слабо',
                latest ? `Последнее среднее значение ${latest.value.toFixed(2)} на ${latest.date}` : 'История наблюдений ещё не собрана',
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-neutral-600">
                  <span style={{ color: '#16a34a' }}>✦</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
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

      {loading ? (
        <div className="flex items-center justify-center h-64 border border-neutral-200">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neutral-900" />
        </div>
      ) : compare ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-neutral-400 mb-2">Снимок А: {sliderLabels[0]}</p>
            <NdviFieldMap fields={fields} date={compareDateIso} showImages={heatmap} />
          </div>
          <div>
            <p className="text-xs text-neutral-400 mb-2">Снимок Б: {sliderDateStr}</p>
            <NdviFieldMap fields={fields} date={sliderDateIso} showImages={heatmap} />
          </div>
        </div>
      ) : (
        <NdviFieldMap fields={fields} date={sliderDateIso} showImages={heatmap} />
      )}
      <div className="mt-3 flex flex-wrap gap-3">
        {[{ color: '#1a9850', label: 'высокий NDVI, плотная растительность' }, { color: '#fee08b', label: 'средний' }, { color: '#d73027', label: 'низкий NDVI, слабая растительность' }].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-neutral-500">{item.label}</span>
          </div>
        ))}
      </div>

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