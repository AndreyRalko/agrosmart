'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getRationCostChart, getRationFeedStructure, getRations, getRationStats, RATION_TYPE_LABELS } from '@/lib/api/ration/ration';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { parseDrfError } from '@/lib/utils/drf-errors';
import { formatMoney } from '@/lib/utils/ration';
import type { Ration, RationCostChartItem, RationFeedStructureItem, RationStats, RationType } from '@/lib/types/ration/ration';
import ChartPanel, { EMPTY_CHART_TEXT, feedStructureToPieItems } from '@/components/ration/ChartPanel';
import RationCard from '@/components/ration/RationCard';
import RationSidebar from '@/components/ration/RationSidebar';
import { useAnimalLabels } from '@/components/ration/animals';
import { NoticeBox, useRationActions } from '@/components/ration/actions';
import BarChart from '@/components/ui/BarChart';
import PieChart from '@/components/ui/PieChart';
import { formatNumber, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui/form';

const MAX_COMPARE = 4;

type DeviationFilter = '' | 'ok' | 'deviations';
type ActivityFilter = 'all' | 'active' | 'archived';

export default function RationListPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const animalLabel = useAnimalLabels();

  const [rations, setRations] = useState<Ration[]>([]);
  const [stats, setStats] = useState<RationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Графики грузятся отдельно: их сбой не должен скрывать список рационов.
  const [costChart, setCostChart] = useState<RationCostChartItem[]>([]);
  const [structureChart, setStructureChart] = useState<RationFeedStructureItem[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [costError, setCostError] = useState('');
  const [structureError, setStructureError] = useState('');

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<RationType | ''>('');
  const [deviationFilter, setDeviationFilter] = useState<DeviationFilter>('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [activity, setActivity] = useState<ActivityFilter>('all');

  const [selected, setSelected] = useState<number[]>([]);
  const [sidebar, setSidebar] = useState<{ mode: 'create' | 'edit'; ration: Ration | null } | null>(null);

  const load = async () => {
    setError('');
    try {
      const [list, st] = await Promise.all([getRations(), getRationStats()]);
      setRations(list);
      setStats(st);
      setSelected(prev => prev.filter(id => list.some(r => r.id === id)));
    } catch (err) {
      setError(parseDrfError(err, [], 'Не удалось загрузить рационы').message);
    } finally {
      setLoading(false);
    }
  };

  const loadCharts = async () => {
    setChartsLoading(true);
    const [cost, structure] = await Promise.allSettled([getRationCostChart(), getRationFeedStructure()]);
    if (cost.status === 'fulfilled') { setCostChart(cost.value); setCostError(''); }
    else setCostError(parseDrfError(cost.reason, [], 'Не удалось загрузить диаграмму стоимости').message);
    if (structure.status === 'fulfilled') { setStructureChart(structure.value); setStructureError(''); }
    else setStructureError(parseDrfError(structure.reason, [], 'Не удалось загрузить диаграмму структуры кормов').message);
    setChartsLoading(false);
  };

  const reload = async () => { await Promise.all([load(), loadCharts()]); };

  useEffect(() => { load(); loadCharts(); }, []);

  const actions = useRationActions(() => reload());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rations
      .filter(r => !q || r.name.toLowerCase().includes(q))
      .filter(r => !typeFilter || r.ration_type === typeFilter)
      .filter(r => deviationFilter === '' || (deviationFilter === 'ok' ? r.deviation_count === 0 : r.deviation_count > 0))
      .filter(r => !createdFrom || r.created_at.slice(0, 10) >= createdFrom)
      .filter(r => activity === 'all' || (activity === 'active' ? r.is_active : !r.is_active))
      .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name, 'ru'));
  }, [rations, search, typeFilter, deviationFilter, createdFrom, activity]);

  const costItems = useMemo(
    () => costChart.map(r => ({ label: r.name, value: r.cost_per_head })),
    [costChart],
  );
  const feedItems = useMemo(() => feedStructureToPieItems(structureChart), [structureChart]);

  const toggleSelect = (id: number) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= MAX_COMPARE ? prev : [...prev, id]));

  const hasFilters = search || typeFilter || deviationFilter || createdFrom || activity !== 'all';
  const label = 'block text-xs font-medium text-neutral-700 mb-1.5';

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Рационы кормления</h1>
          <p className="text-sm text-neutral-500 mt-1">Состав, питательность и стоимость рационов, сравнение с нормативами</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/ration/norms" className={secondaryButtonClass}>Нормативы</Link>
          <button
            onClick={() => router.push(`/ration/compare?ids=${selected.join(',')}`)}
            disabled={selected.length < 2}
            className={secondaryButtonClass}
            title={selected.length < 2 ? 'Отметьте от 2 до 4 рационов' : undefined}
          >
            Сравнить ({selected.length})
          </button>
          <button onClick={() => setSidebar({ mode: 'create', ration: null })} className={`${primaryButtonClass} flex items-center gap-2`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Создать рацион
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-neutral-200 p-8"><p className="text-sm text-neutral-500">{t('loading')}</p></div>
      ) : error ? (
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-red-600 whitespace-pre-line mb-4">{error}</p>
          <button onClick={() => { setLoading(true); load(); }} className={secondaryButtonClass}>Повторить</button>
        </div>
      ) : (
        <>
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {[
                { label: 'Активных рационов', value: formatNumber(stats.active_rations, 0) },
                { label: 'Рационов с привязкой к животному', value: formatNumber(stats.groups_on_feeding, 0) },
                { label: 'Средняя стоимость, ₸/гол./сутки', value: formatMoney(stats.avg_cost_per_head) },
                { label: 'Затраты за 30 дней', value: formatMoney(stats.total_cost_30_days) },
                { label: 'Рационов с отклонениями', value: formatNumber(stats.rations_with_deviations, 0), warn: stats.rations_with_deviations > 0 },
              ].map(card => (
                <div key={card.label} className="bg-white border border-neutral-200 p-4">
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">{card.label}</p>
                  <p className={`text-2xl font-bold ${card.warn ? 'text-red-600' : 'text-neutral-900'}`}>{card.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <ChartPanel title="Стоимость рационов, ₸/гол./сутки" loading={chartsLoading} error={costError} onRetry={loadCharts}>
              <BarChart
                title="Стоимость рационов, ₸/гол./сутки"
                items={costItems}
                formatValue={v => v.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                emptyText={EMPTY_CHART_TEXT}
              />
            </ChartPanel>
            <ChartPanel title="Структура кормов по стоимости, ₸/гол./сутки" loading={chartsLoading} error={structureError} onRetry={loadCharts}>
              <PieChart
                title="Структура кормов по стоимости, ₸/гол./сутки"
                items={feedItems}
                formatValue={v => `${v.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₸`}
                emptyText={EMPTY_CHART_TEXT}
                note="Активные рационы; стоимость кормов на одну голову в сутки, одинаковые корма суммируются."
              />
            </ChartPanel>
          </div>

          <div className="bg-white border border-neutral-200 p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className={label}>Название</label>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." className={inputClass} />
            </div>
            <div>
              <label className={label}>Тип рациона</label>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as RationType | '')} className={inputClass}>
                <option value="">Все</option>
                {(Object.keys(RATION_TYPE_LABELS) as RationType[]).map(k => <option key={k} value={k}>{RATION_TYPE_LABELS[k]}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Статус</label>
              <select value={deviationFilter} onChange={e => setDeviationFilter(e.target.value as DeviationFilter)} className={inputClass}>
                <option value="">Любой</option>
                <option value="ok">В норме</option>
                <option value="deviations">Есть отклонения</option>
              </select>
            </div>
            <div>
              <label className={label}>Создан не ранее</label>
              <input type="date" value={createdFrom} onChange={e => setCreatedFrom(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={label}>Показывать</label>
              <select value={activity} onChange={e => setActivity(e.target.value as ActivityFilter)} className={inputClass}>
                <option value="all">Все</option>
                <option value="active">Активные</option>
                <option value="archived">Архивные</option>
              </select>
            </div>
            {hasFilters && (
              <div className="md:col-span-5">
                <button
                  onClick={() => { setSearch(''); setTypeFilter(''); setDeviationFilter(''); setCreatedFrom(''); setActivity('all'); }}
                  className={secondaryButtonClass}
                >
                  Сбросить
                </button>
              </div>
            )}
          </div>

          <NoticeBox notice={actions.notice} onClose={() => actions.setNotice(null)} />

          {selected.length > 0 && (
            <p className="text-xs text-neutral-500 mb-3">
              Выбрано для сравнения: {selected.length} из {MAX_COMPARE}.{' '}
              <button onClick={() => setSelected([])} className="underline hover:text-neutral-900">Снять выбор</button>
            </p>
          )}

          {filtered.length === 0 ? (
            <div className="bg-white border border-neutral-200 p-8 text-center text-sm text-neutral-500">
              {rations.length === 0 ? 'Рационов пока нет' : 'Ничего не найдено'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(r => (
                <RationCard
                  key={r.id}
                  ration={r}
                  animalLabel={animalLabel(r.animal_group)}
                  selected={selected.includes(r.id)}
                  selectDisabled={selected.length >= MAX_COMPARE}
                  busy={actions.busyId === r.id}
                  onToggleSelect={() => toggleSelect(r.id)}
                  onEdit={() => setSidebar({ mode: 'edit', ration: r })}
                  onCopy={() => actions.copy(r)}
                  onToggleArchive={() => actions.toggleArchive(r)}
                  onDelete={() => actions.remove(r)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <RationSidebar
        isOpen={sidebar !== null}
        mode={sidebar?.mode ?? 'create'}
        ration={sidebar?.ration ?? null}
        animalLabel={animalLabel(sidebar?.ration?.animal_group ?? null)}
        onClose={() => setSidebar(null)}
        onSaved={() => reload()}
      />
    </div>
  );
}
