'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getStorageObject, FEED_TYPE_LABELS, UNIT_LABELS } from '@/lib/api/storage/storage';
import { ApiError } from '@/lib/api/client';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { parseDrfError } from '@/lib/utils/drf-errors';
import type { StorageObject } from '@/lib/types/storage/storage';
import StorageObjectSidebar from '@/components/storage/StorageObjectSidebar';
import SensorsTab from '@/components/storage/SensorsTab';
import DevicesTab from '@/components/storage/DevicesTab';
import ChemistryTab from '@/components/storage/ChemistryTab';
import { FillBar, SensorSummary, StatusBadge } from '@/components/storage/ui';
import { formatDateTime, formatNumber, secondaryButtonClass } from '@/components/ui/form';

const TABS = [
  { key: 'sensors', label: 'Датчики' },
  { key: 'devices', label: 'Устройства' },
  { key: 'chemistry', label: 'Химия корма' },
] as const;
type TabKey = typeof TABS[number]['key'];

export default function StorageDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);

  const [object, setObject] = useState<StorageObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<TabKey>('sensors');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isInteger(id) || id <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setError('');
    try {
      setObject(await getStorageObject(id));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true);
      else setError(parseDrfError(err, [], 'Не удалось загрузить объект').message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const backLink = (
    <Link href="/storage" className="text-sm text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1 mb-4">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Хранение кормов
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

  if (notFound || error || !object) {
    return (
      <div className="p-4 md:p-8">
        {backLink}
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-red-600 whitespace-pre-line mb-4">
            {notFound ? 'Объект хранения не найден' : error}
          </p>
          {!notFound && (
            <button onClick={() => { setLoading(true); load(); }} className={secondaryButtonClass}>Повторить</button>
          )}
        </div>
      </div>
    );
  }

  const unit = UNIT_LABELS[object.unit] ?? object.unit;

  return (
    <div className="p-4 md:p-8">
      {backLink}

      <div className="bg-white border border-neutral-200 p-5 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-semibold text-neutral-900">{object.name}</h1>
              <StatusBadge status={object.status} />
            </div>
            <p className="text-sm text-neutral-500">
              {object.location} · {FEED_TYPE_LABELS[object.feed_type] ?? object.feed_type}
              {object.culture ? ` · ${object.culture}` : ''}
            </p>
          </div>
          <button onClick={() => setSidebarOpen(true)} className={secondaryButtonClass}>{t('edit')}</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-neutral-500 mb-1">Заполненность</p>
            <p className="text-sm text-neutral-900 mb-1">
              {formatNumber(object.current_amount)} / {formatNumber(object.max_capacity)} {unit}
            </p>
            <FillBar current={object.current_amount} capacity={object.max_capacity} />
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">Последнее показание</p>
            <SensorSummary sensor={object.latest_sensor} />
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">Создан</p>
            <p className="text-sm text-neutral-900">{formatDateTime(object.created_at)}</p>
          </div>
        </div>

        {object.notes && (
          <p className="mt-4 pt-4 border-t border-neutral-100 text-sm text-neutral-700 whitespace-pre-line">{object.notes}</p>
        )}
      </div>

      <div className="flex gap-1 border-b border-neutral-200 mb-4">
        {TABS.map(item => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${tab === item.key
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'sensors' && <SensorsTab storageId={object.id} onChanged={load} />}
      {tab === 'devices' && <DevicesTab storageId={object.id} />}
      {tab === 'chemistry' && <ChemistryTab storageId={object.id} />}

      <StorageObjectSidebar
        isOpen={sidebarOpen}
        object={object}
        onClose={() => setSidebarOpen(false)}
        onSaved={saved => setObject(saved)}
        onDeleted={() => router.push('/storage')}
      />
    </div>
  );
}
