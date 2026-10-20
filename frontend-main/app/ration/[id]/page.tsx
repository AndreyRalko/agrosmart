'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getRation, getRationFeedStructure, getRationNutrition, RATION_TYPE_LABELS } from '@/lib/api/ration/ration';
import { ApiError } from '@/lib/api/client';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { parseDrfError } from '@/lib/utils/drf-errors';
import { formatPeriod } from '@/lib/utils/ration';
import type { Ration, RationFeedStructureItem, RationNutritionResponse } from '@/lib/types/ration/ration';
import RationSidebar, { type RationSidebarMode } from '@/components/ration/RationSidebar';
import CompositionTab from '@/components/ration/CompositionTab';
import { AssignmentsTab, CostTab, FutureSection, NutritionTab } from '@/components/ration/DetailTabs';
import { ActiveBadge } from '@/components/ration/RationCard';
import { useAnimalLabels } from '@/components/ration/animals';
import { NoticeBox, useRationActions } from '@/components/ration/actions';
import { formatNumber, primaryButtonClass, secondaryButtonClass } from '@/components/ui/form';

const TABS = [
  { key: 'composition', label: 'Состав' },
  { key: 'nutrition', label: 'Питательность' },
  { key: 'cost', label: 'Стоимость' },
  { key: 'assignments', label: 'Назначения' },
  { key: 'history', label: 'История изменений' },
] as const;
type TabKey = typeof TABS[number]['key'];

export default function RationDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const animalLabel = useAnimalLabels();

  const [ration, setRation] = useState<Ration | null>(null);
  const [nutrition, setNutrition] = useState<RationNutritionResponse | null>(null);
  const [structure, setStructure] = useState<RationFeedStructureItem[]>([]);
  const [structureLoading, setStructureLoading] = useState(true);
  const [structureError, setStructureError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<TabKey>('composition');
  const [sidebarMode, setSidebarMode] = useState<RationSidebarMode | null>(null);

  /** Диаграмма отдельно от load: её сбой не должен скрывать карточку рациона. */
  const loadStructure = useCallback(async () => {
    if (!Number.isInteger(id) || id <= 0) return;
    setStructureLoading(true);
    try {
      setStructure(await getRationFeedStructure(id));
      setStructureError('');
    } catch (err) {
      setStructureError(parseDrfError(err, [], 'Не удалось загрузить диаграмму структуры кормов').message);
    } finally {
      setStructureLoading(false);
    }
  }, [id]);

  /** Рацион, его питательность (с нормой) и диаграмма перезапрашиваются после каждого изменения. */
  const load = useCallback(async () => {
    if (!Number.isInteger(id) || id <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setError('');
    try {
      void loadStructure();
      const [r, n] = await Promise.all([getRation(id), getRationNutrition(id)]);
      setRation(r);
      setNutrition(n);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true);
      else setError(parseDrfError(err, [], 'Не удалось загрузить рацион').message);
    } finally {
      setLoading(false);
    }
  }, [id, loadStructure]);

  useEffect(() => { load(); }, [load]);

  const actions = useRationActions(() => load());

  const backLink = (
    <Link href="/ration" className="text-sm text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1 mb-4">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      К списку рационов
    </Link>
  );

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        {backLink}
        <div className="bg-white border border-neutral-200 p-8"><p className="text-sm text-neutral-500">{t('loading')}</p></div>
      </div>
    );
  }

  if (notFound || error || !ration || !nutrition) {
    return (
      <div className="p-4 md:p-8">
        {backLink}
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-red-600 whitespace-pre-line mb-4">{notFound ? 'Рацион не найден' : error}</p>
          {!notFound && <button onClick={() => { setLoading(true); load(); }} className={secondaryButtonClass}>Повторить</button>}
        </div>
      </div>
    );
  }

  const animal = animalLabel(ration.animal_group);
  const busy = actions.busyId === ration.id;

  return (
    <div className="p-4 md:p-8">
      {backLink}

      <div className="bg-white border border-neutral-200 p-5 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-semibold text-neutral-900">{ration.name}</h1>
              <ActiveBadge active={ration.is_active} />
            </div>
            <p className="text-sm text-neutral-500">
              {RATION_TYPE_LABELS[ration.ration_type] ?? ration.ration_type}
              {' · '}{animal ?? 'без привязки к животному'}
              {' · '}{formatNumber(ration.animal_count, 0)} гол.
              {' · '}{formatPeriod(ration.date_start, ration.date_end)}
            </p>
            {ration.notes && <p className="text-sm text-neutral-700 mt-2 whitespace-pre-line">{ration.notes}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSidebarMode('assign')} className={primaryButtonClass}>Назначить рацион</button>
            <button onClick={() => setSidebarMode('edit')} className={secondaryButtonClass}>{t('edit')}</button>
            <button onClick={() => actions.copy(ration)} disabled={busy} className={secondaryButtonClass}>Создать копию</button>
            <button onClick={() => actions.toggleArchive(ration)} disabled={busy} className={secondaryButtonClass}>
              {ration.is_active ? 'Архивировать' : 'Вернуть из архива'}
            </button>
          </div>
        </div>
      </div>

      <NoticeBox notice={actions.notice} onClose={() => actions.setNotice(null)} />

      <div className="flex gap-1 border-b border-neutral-200 mb-4 overflow-x-auto">
        {TABS.map(item => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 whitespace-nowrap transition-colors ${tab === item.key
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'}`}
          >
            {item.label}
            {item.key === 'composition' && nutrition.deviation_count > 0 && (
              <span className="ml-2 px-1.5 text-xs bg-red-600 text-white">{nutrition.deviation_count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'composition' && (
        <CompositionTab
          ration={ration}
          nutrition={nutrition.nutrition}
          deviations={nutrition.deviations}
          normMissing={nutrition.norm === null}
          structure={structure}
          structureLoading={structureLoading}
          structureError={structureError}
          onRetryStructure={loadStructure}
          onChanged={load}
        />
      )}
      {tab === 'nutrition' && <NutritionTab ration={ration} nutrition={nutrition.nutrition} norm={nutrition.norm} />}
      {tab === 'cost' && <CostTab ration={ration} nutrition={nutrition.nutrition} />}
      {tab === 'assignments' && (
        <AssignmentsTab ration={ration} animalLabel={animal} onAssign={() => setSidebarMode('assign')} />
      )}
      {tab === 'history' && (
        <FutureSection
          title="История изменений"
          text="Журнал правок состава и параметров рациона (кто, когда, что изменил) появится после доработки API."
        />
      )}

      <RationSidebar
        isOpen={sidebarMode !== null}
        mode={sidebarMode ?? 'edit'}
        ration={ration}
        animalLabel={animal}
        onClose={() => setSidebarMode(null)}
        onSaved={() => load()}
      />
    </div>
  );
}
