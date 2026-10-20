'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  deleteStorageObject, getStorageObjects, getStorageStats,
  FEED_TYPE_LABELS, STATUS_LABELS, UNIT_LABELS,
} from '@/lib/api/storage/storage';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { parseDrfError } from '@/lib/utils/drf-errors';
import type { FeedType, StorageObject, StorageStats, StorageStatus } from '@/lib/types/storage/storage';
import StorageObjectSidebar from '@/components/storage/StorageObjectSidebar';
import { FillBar, SensorSummary, StatusBadge } from '@/components/storage/ui';
import {
  ErrorBox, formatNumber, inputClass, primaryButtonClass, secondaryButtonClass, tdClass, thClass,
} from '@/components/ui/form';

export default function StoragePage() {
  const { t } = useTranslation();
  const [objects, setObjects] = useState<StorageObject[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  const [search, setSearch] = useState('');
  const [feedFilter, setFeedFilter] = useState<FeedType | ''>('');
  const [statusFilter, setStatusFilter] = useState<StorageStatus | ''>('');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editing, setEditing] = useState<StorageObject | null>(null);

  const load = async () => {
    setError('');
    try {
      const [list, st] = await Promise.all([getStorageObjects(), getStorageStats()]);
      setObjects(list);
      setStats(st);
    } catch (err) {
      setError(parseDrfError(err, [], 'Не удалось загрузить объекты хранения').message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return objects
      .filter(o => !q || o.name.toLowerCase().includes(q))
      .filter(o => !feedFilter || o.feed_type === feedFilter)
      .filter(o => !statusFilter || o.status === statusFilter)
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [objects, search, feedFilter, statusFilter]);

  const openCreate = () => { setEditing(null); setSidebarOpen(true); };
  const openEdit = (o: StorageObject) => { setEditing(o); setSidebarOpen(true); };

  const handleDelete = async (o: StorageObject) => {
    if (!confirm(`Удалить объект «${o.name}»? Будут удалены также показания, устройства и анализы.`)) return;
    setActionError('');
    try {
      await deleteStorageObject(o.id);
      await load();
    } catch (err) {
      setActionError(parseDrfError(err, [], 'Не удалось удалить объект').message);
    }
  };

  const hasFilters = search || feedFilter || statusFilter;

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Хранение кормов</h1>
        <button onClick={openCreate} className={`${primaryButtonClass} flex items-center gap-2`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('create')}
        </button>
      </div>

      {loading ? (
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        </div>
      ) : error ? (
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-red-600 whitespace-pre-line mb-4">{error}</p>
          <button onClick={() => { setLoading(true); load(); }} className={secondaryButtonClass}>Повторить</button>
        </div>
      ) : (
        <>
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Объектов', value: formatNumber(stats.total_objects, 0) },
                { label: 'Текущий запас', value: formatNumber(stats.total_current_amount) },
                { label: 'Общая вместимость', value: formatNumber(stats.total_capacity) },
                { label: 'С отклонениями', value: formatNumber(stats.deviations, 0), warn: stats.deviations > 0 },
              ].map(card => (
                <div key={card.label} className="bg-white border border-neutral-200 p-4">
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">{card.label}</p>
                  <p className={`text-2xl font-bold ${card.warn ? 'text-red-600' : 'text-neutral-900'}`}>{card.value}</p>
                </div>
              ))}
            </div>
          )}
          {stats && objects.some(o => o.unit !== objects[0].unit) && (
            <p className="text-xs text-neutral-500 -mt-4 mb-6">
              Суммы запаса и вместимости складываются без учёта единиц измерения (т, кг, м³).
            </p>
          )}

          <div className="bg-white border border-neutral-200 p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Название</label>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Тип корма</label>
              <select value={feedFilter} onChange={e => setFeedFilter(e.target.value as FeedType | '')} className={inputClass}>
                <option value="">Все</option>
                {(Object.keys(FEED_TYPE_LABELS) as FeedType[]).map(k => <option key={k} value={k}>{FEED_TYPE_LABELS[k]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Статус</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StorageStatus | '')} className={inputClass}>
                <option value="">Все</option>
                {(Object.keys(STATUS_LABELS) as StorageStatus[]).map(k => <option key={k} value={k}>{STATUS_LABELS[k]}</option>)}
              </select>
            </div>
            {hasFilters && (
              <div className="md:col-span-4">
                <button
                  type="button"
                  onClick={() => { setSearch(''); setFeedFilter(''); setStatusFilter(''); }}
                  className={secondaryButtonClass}
                >
                  Сбросить
                </button>
              </div>
            )}
          </div>

          <ErrorBox message={actionError} />

          {/* Мобильная версия — карточки */}
          <div className="md:hidden space-y-3">
            {filtered.map(o => (
              <div key={o.id} className="bg-white border border-neutral-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <Link href={`/storage/${o.id}`} className="text-sm font-medium text-neutral-900 hover:underline">{o.name}</Link>
                  <StatusBadge status={o.status} />
                </div>
                <div className="text-xs text-neutral-500 mb-2">
                  {o.location} · {FEED_TYPE_LABELS[o.feed_type] ?? o.feed_type}{o.culture ? ` · ${o.culture}` : ''}
                </div>
                <div className="text-xs text-neutral-700 mb-1">
                  {formatNumber(o.current_amount)} / {formatNumber(o.max_capacity)} {UNIT_LABELS[o.unit] ?? o.unit}
                </div>
                <FillBar current={o.current_amount} capacity={o.max_capacity} />
                <div className="mt-2"><SensorSummary sensor={o.latest_sensor} /></div>
                <div className="flex gap-4 mt-3 text-xs">
                  <button onClick={() => openEdit(o)} className="text-neutral-600 hover:text-neutral-900">{t('edit')}</button>
                  <button onClick={() => handleDelete(o)} className="text-red-600 hover:text-red-700">{t('delete')}</button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="bg-white border border-neutral-200 p-8 text-center text-sm text-neutral-500">
                {objects.length === 0 ? 'Объектов хранения пока нет' : 'Ничего не найдено'}
              </div>
            )}
          </div>

          {/* Десктоп — таблица */}
          <div className="hidden md:block bg-white border border-neutral-200 overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className={thClass}>Название</th>
                  <th className={thClass}>Локация</th>
                  <th className={thClass}>Тип корма</th>
                  <th className={thClass}>Культура</th>
                  <th className={thClass}>Запас / вместимость</th>
                  <th className={thClass}>Статус</th>
                  <th className={thClass}>Последнее показание</th>
                  <th className={thClass}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {filtered.map(o => (
                  <tr key={o.id} className="hover:bg-neutral-50 transition-colors">
                    <td className={tdClass}>
                      <Link href={`/storage/${o.id}`} className="font-medium hover:underline">{o.name}</Link>
                    </td>
                    <td className={tdClass}>{o.location}</td>
                    <td className={tdClass}>{FEED_TYPE_LABELS[o.feed_type] ?? o.feed_type}</td>
                    <td className={tdClass}>{o.culture || <span className="text-neutral-400">—</span>}</td>
                    <td className={tdClass}>
                      <div className="text-xs text-neutral-700 mb-1 whitespace-nowrap">
                        {formatNumber(o.current_amount)} / {formatNumber(o.max_capacity)} {UNIT_LABELS[o.unit] ?? o.unit}
                      </div>
                      <FillBar current={o.current_amount} capacity={o.max_capacity} />
                    </td>
                    <td className={tdClass}><StatusBadge status={o.status} /></td>
                    <td className={tdClass}><SensorSummary sensor={o.latest_sensor} /></td>
                    <td className={`${tdClass} whitespace-nowrap`}>
                      <button onClick={() => openEdit(o)} className="text-neutral-600 hover:text-neutral-900 mr-3" aria-label={t('edit')} title={t('edit')}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(o)} className="text-neutral-400 hover:text-red-600" aria-label={t('delete')} title={t('delete')}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-neutral-500">
                {objects.length === 0 ? 'Объектов хранения пока нет' : 'Ничего не найдено'}
              </div>
            )}
          </div>
        </>
      )}

      <StorageObjectSidebar
        isOpen={sidebarOpen}
        object={editing}
        onClose={() => setSidebarOpen(false)}
        onSaved={() => load()}
        onDeleted={() => load()}
      />
    </div>
  );
}
