'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { deleteFeed, getFeeds } from '@/lib/api/ration/ration';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { parseDrfError } from '@/lib/utils/drf-errors';
import { formatMoney, rationErrorMessage } from '@/lib/utils/ration';
import { FEED_NUTRIENT_FIELDS, type Feed } from '@/lib/types/ration/ration';
import FeedSidebar, { FEED_FIELD_META } from '@/components/ration/FeedSidebar';
import {
  ErrorBox, formatNumber, inputClass, primaryButtonClass, secondaryButtonClass, tdClass, thClass,
} from '@/components/ui/form';

export default function FeedsPage() {
  const { t } = useTranslation();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [search, setSearch] = useState('');
  const [sidebar, setSidebar] = useState<{ feed: Feed | null } | null>(null);

  const load = async () => {
    setError('');
    try {
      setFeeds(await getFeeds());
    } catch (err) {
      setError(parseDrfError(err, [], 'Не удалось загрузить справочник кормов').message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return feeds.filter(f => !q || f.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [feeds, search]);

  const handleDelete = async (feed: Feed) => {
    if (!confirm(`Удалить корм «${feed.name}» из справочника?`)) return;
    setActionError('');
    try {
      await deleteFeed(feed.id);
      await load();
    } catch (err) {
      setActionError(rationErrorMessage(err, 'Не удалось удалить корм').message);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <Link href="/ration" className="text-sm text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1 mb-4">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        К списку рационов
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Справочник кормов</h1>
          <p className="text-sm text-neutral-500 mt-1">Питательность на натуральную массу и цена — используются в расчёте рационов</p>
        </div>
        <button onClick={() => setSidebar({ feed: null })} className={`${primaryButtonClass} flex items-center gap-2`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Добавить корм
        </button>
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
          <div className="bg-white border border-neutral-200 p-4 mb-4 max-w-md">
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">Название</label>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." className={inputClass} />
          </div>

          <ErrorBox message={actionError} />

          <div className="md:hidden space-y-3">
            {filtered.map(f => (
              <div key={f.id} className="bg-white border border-neutral-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium text-neutral-900">{f.name}</p>
                  <p className="text-sm text-neutral-900">{formatMoney(f.price_per_kg)}/кг</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {FEED_NUTRIENT_FIELDS.map(k => (
                    <div key={k}>
                      <span className="text-neutral-500">{FEED_FIELD_META[k].short}:</span>{' '}
                      <span className="text-neutral-900">{formatNumber(f[k], 3)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-3 text-xs">
                  <button onClick={() => setSidebar({ feed: f })} className="text-neutral-600 hover:text-neutral-900">{t('edit')}</button>
                  <button onClick={() => handleDelete(f)} className="text-red-600 hover:text-red-700">{t('delete')}</button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block bg-white border border-neutral-200 overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className={thClass}>Корм</th>
                  {FEED_NUTRIENT_FIELDS.map(k => (
                    <th key={k} className={`${thClass} whitespace-nowrap`} title={FEED_FIELD_META[k].label}>
                      {FEED_FIELD_META[k].short}, {FEED_FIELD_META[k].unit}
                    </th>
                  ))}
                  <th className={`${thClass} whitespace-nowrap`}>Цена, ₸/кг</th>
                  <th className={thClass}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filtered.map(f => (
                  <tr key={f.id} className="hover:bg-neutral-50">
                    <td className={`${tdClass} font-medium`}>{f.name}</td>
                    {FEED_NUTRIENT_FIELDS.map(k => <td key={k} className={tdClass}>{formatNumber(f[k], 3)}</td>)}
                    <td className={`${tdClass} whitespace-nowrap`}>{formatMoney(f.price_per_kg)}</td>
                    <td className={`${tdClass} whitespace-nowrap text-xs`}>
                      <button onClick={() => setSidebar({ feed: f })} className="text-neutral-600 hover:text-neutral-900 mr-3">{t('edit')}</button>
                      <button onClick={() => handleDelete(f)} className="text-red-600 hover:text-red-700">{t('delete')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="bg-white border border-neutral-200 p-8 text-center text-sm text-neutral-500 md:border-t-0">
              {feeds.length === 0 ? 'Справочник кормов пуст' : 'Ничего не найдено'}
            </div>
          )}
        </>
      )}

      <FeedSidebar
        isOpen={sidebar !== null}
        feed={sidebar?.feed ?? null}
        onClose={() => setSidebar(null)}
        onSaved={() => load()}
      />
    </div>
  );
}
