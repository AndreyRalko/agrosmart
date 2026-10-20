'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import Link from 'next/link';
import { addRationFeed, deleteRationFeed, updateRationFeed } from '@/lib/api/ration/ration';
import { FEED_TYPE_LABELS, getStorageObjects } from '@/lib/api/storage/storage';
import { formatMoney, rationErrorMessage, rationLineName, rowNutrition, type NutrientKey } from '@/lib/utils/ration';
import type { Ration, RationDeviation, RationFeed, RationFeedStructureItem, RationNutrition } from '@/lib/types/ration/ration';
import type { StorageObject } from '@/lib/types/storage/storage';
import ChartPanel, { EMPTY_CHART_TEXT, feedStructureToPieItems } from '@/components/ration/ChartPanel';
import PieChart from '@/components/ui/PieChart';
import {
  ErrorBox, FieldError, formatNumber, inputClass, inputErrorClass, primaryButtonClass, tdClass, thClass,
} from '@/components/ui/form';

interface CompositionTabProps {
  ration: Ration;
  /** Питательность из /nutrition/ — источник правды для итогов. */
  nutrition: RationNutrition;
  deviations: RationDeviation[];
  /** Для типа рациона нет нормы — отклонения не проверяются. */
  normMissing: boolean;
  /** Диаграмма из /charts/feed-structure/?ration=<id>. */
  structure: RationFeedStructureItem[];
  structureLoading: boolean;
  structureError: string;
  onRetryStructure: () => void;
  /** Вызывается после любого изменения состава. */
  onChanged: () => Promise<void>;
}

const COLUMNS: { key: NutrientKey; label: string; digits: number }[] = [
  { key: 'dry_matter', label: 'СВ, кг', digits: 2 },
  { key: 'energy', label: 'Энергия, МДж', digits: 1 },
  { key: 'protein', label: 'Протеин, кг', digits: 2 },
  { key: 'fiber', label: 'Клетчатка, кг', digits: 2 },
  { key: 'calcium', label: 'Ca, г', digits: 1 },
  { key: 'phosphorus', label: 'P, г', digits: 1 },
];

/** Допуск сверки итогов: строки считаются на фронте, итог отдаёт бэк. */
const EPS = 0.01;

export default function CompositionTab({
  ration, nutrition, deviations, normMissing, structure, structureLoading, structureError,
  onRetryStructure, onChanged,
}: CompositionTabProps) {
  const [storages, setStorages] = useState<StorageObject[]>([]);
  const [storagesError, setStoragesError] = useState('');
  const [storageId, setStorageId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [addFieldErrors, setAddFieldErrors] = useState<Record<string, string>>({});

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQty, setEditQty] = useState('');
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const [rowError, setRowError] = useState('');

  useEffect(() => {
    getStorageObjects()
      .then(list => { setStorages(list); setStoragesError(''); })
      .catch(err => setStoragesError(rationErrorMessage(err, 'Не удалось загрузить склады').message));
  }, []);

  const rows = useMemo(
    () => ration.ration_feeds.map(rf => ({ rf, n: rowNutrition(rf) })),
    [ration.ration_feeds],
  );

  const sums = useMemo(() => {
    const s = { quantity: 0, cost: 0 } as Record<NutrientKey | 'quantity' | 'cost', number>;
    for (const { n } of rows) {
      s.quantity += n.quantity;
      s.cost += n.cost;
      for (const c of COLUMNS) s[c.key] = (s[c.key] ?? 0) + n[c.key];
    }
    return s;
  }, [rows]);

  const mismatch = rows.length > 0 && (
    Math.abs(sums.quantity - nutrition.total_weight) > EPS
    || Math.abs(sums.cost - nutrition.cost_per_head) > EPS
    || COLUMNS.some(c => Math.abs((sums[c.key] ?? 0) - nutrition[c.key]) > EPS)
  );

  // Корма, уже входящие в состав, скрыты: повтор бэк не валидирует и падает с 500.
  const usedStorageIds = new Set(ration.ration_feeds.map(rf => rf.storage_id).filter((id): id is number => id != null));
  const availableStorages = storages
    .filter(s => !usedStorageIds.has(s.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  const validQty = (v: string) => v !== '' && Number.isFinite(Number(v)) && Number(v) > 0;

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!storageId) errs.storage_id = 'Выберите склад';
    if (!validQty(quantity)) errs.quantity_kg = 'Укажите килограммы больше 0';
    if (Object.keys(errs).length) {
      setAddFieldErrors(errs);
      return;
    }
    setAdding(true);
    setAddError('');
    setAddFieldErrors({});
    try {
      await addRationFeed(ration.id, { storage_id: Number(storageId), quantity_kg: quantity });
      setStorageId('');
      setQuantity('');
      await onChanged();
    } catch (err) {
      const parsed = rationErrorMessage(err, 'Не удалось добавить склад', ['storage_id', 'quantity_kg']);
      setAddFieldErrors(parsed.fields);
      setAddError(parsed.message);
    } finally {
      setAdding(false);
    }
  };

  const saveQty = async (rf: RationFeed) => {
    if (!validQty(editQty)) {
      setRowError('Количество должно быть больше 0');
      return;
    }
    setRowBusy(rf.id);
    setRowError('');
    try {
      await updateRationFeed(ration.id, rf.id, { quantity_kg: editQty });
      setEditingId(null);
      await onChanged();
    } catch (err) {
      setRowError(rationErrorMessage(err, 'Не удалось изменить количество', []).message);
    } finally {
      setRowBusy(null);
    }
  };

  const removeRow = async (rf: RationFeed) => {
    if (!confirm(`Убрать «${rationLineName(rf)}» из рациона?`)) return;
    setRowBusy(rf.id);
    setRowError('');
    try {
      await deleteRationFeed(ration.id, rf.id);
      await onChanged();
    } catch (err) {
      setRowError(rationErrorMessage(err, 'Не удалось удалить корм из состава', []).message);
    } finally {
      setRowBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <ErrorBox message={rowError} />

      <ChartPanel title="Структура кормов по стоимости" loading={structureLoading} error={structureError} onRetry={onRetryStructure}>
        <PieChart
          title="Структура кормов по стоимости, ₸/гол./сутки"
          items={feedStructureToPieItems(structure)}
          formatValue={v => `${v.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₸`}
          emptyText={EMPTY_CHART_TEXT}
        />
      </ChartPanel>

      {rows.length === 0 ? (
        <div className="bg-white border border-neutral-200 p-8 text-center text-sm text-neutral-500">
          В рационе пока нет складов — добавьте их ниже.
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className={thClass}>Склад</th>
                <th className={thClass}>Кол-во, кг</th>
                {COLUMNS.map(c => <th key={c.key} className={`${thClass} whitespace-nowrap`}>{c.label}</th>)}
                <th className={`${thClass} whitespace-nowrap`}>Стоимость, ₸</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {rows.map(({ rf, n }) => (
                <tr key={rf.id} className="hover:bg-neutral-50">
                  <td className={`${tdClass} font-medium`}>{rationLineName(rf)}</td>
                  <td className={tdClass}>
                    {editingId === rf.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min="0" step="0.001" value={editQty} autoFocus
                          onChange={e => setEditQty(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveQty(rf); if (e.key === 'Escape') setEditingId(null); }}
                          className="w-24 px-2 py-1 border border-neutral-300 text-sm focus:outline-none focus:border-neutral-900"
                        />
                        <button onClick={() => saveQty(rf)} disabled={rowBusy === rf.id} className="text-xs text-neutral-900 font-medium">OK</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-neutral-500">Отмена</button>
                      </div>
                    ) : (
                      formatNumber(n.quantity, 3)
                    )}
                  </td>
                  {COLUMNS.map(c => <td key={c.key} className={tdClass}>{formatNumber(n[c.key], c.digits)}</td>)}
                  <td className={`${tdClass} whitespace-nowrap`}>{formatMoney(n.cost)}</td>
                  <td className={`${tdClass} whitespace-nowrap text-xs`}>
                    {editingId !== rf.id && (
                      <>
                        <button
                          onClick={() => { setEditingId(rf.id); setEditQty(rf.quantity_kg); setRowError(''); }}
                          disabled={rowBusy === rf.id}
                          className="text-neutral-600 hover:text-neutral-900 mr-3 disabled:text-neutral-300"
                        >
                          Изменить
                        </button>
                        <button onClick={() => removeRow(rf)} disabled={rowBusy === rf.id} className="text-red-600 hover:text-red-700 disabled:text-neutral-300">
                          Удалить
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-neutral-50 border-t-2 border-neutral-200">
              {/* Итог — значения бэка (Ration.get_nutrition), они главнее суммы строк. */}
              <tr>
                <td className={`${tdClass} font-semibold`}>Итого на 1 голову</td>
                <td className={`${tdClass} font-semibold`}>{formatNumber(nutrition.total_weight, 3)}</td>
                {COLUMNS.map(c => (
                  <td key={c.key} className={`${tdClass} font-semibold`}>{formatNumber(nutrition[c.key], c.digits)}</td>
                ))}
                <td className={`${tdClass} font-semibold whitespace-nowrap`}>{formatMoney(nutrition.cost_per_head)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
          {mismatch && (
            <p className="px-4 py-2 text-xs text-amber-700 border-t border-neutral-200">
              Сумма строк расходится с итогом, рассчитанным сервером. В строке «Итого» показаны значения сервера.
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleAdd} className="bg-white border border-neutral-200 p-4" noValidate>
        <p className="text-sm font-medium text-neutral-900 mb-3">Добавить со склада</p>
        <ErrorBox message={addError || storagesError} />
        {storages.length === 0 && !storagesError ? (
          <p className="text-sm text-neutral-500">
            Складов пока нет. <Link href="/storage" className="underline">Создайте их в хранении кормов</Link>.
          </p>
        ) : availableStorages.length === 0 && !storagesError ? (
          <p className="text-sm text-neutral-500">Все склады уже есть в составе.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto] gap-3 items-start">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Склад</label>
              <select value={storageId} onChange={e => setStorageId(e.target.value)} className={addFieldErrors.storage_id ? inputErrorClass : inputClass}>
                <option value="">Выберите склад</option>
                {availableStorages.map(s => (
                  <option key={s.id} value={s.id}>{s.name} · {FEED_TYPE_LABELS[s.feed_type]}</option>
                ))}
              </select>
              <FieldError message={addFieldErrors.storage_id} />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Килограммы на голову в сутки</label>
              <input type="number" min="0" step="0.001" value={quantity} onChange={e => setQuantity(e.target.value)}
                className={addFieldErrors.quantity_kg ? inputErrorClass : inputClass} />
              <FieldError message={addFieldErrors.quantity_kg} />
            </div>
            <div className="sm:pt-6">
              <button type="submit" disabled={adding} className={primaryButtonClass}>{adding ? 'Добавление...' : 'Добавить'}</button>
            </div>
          </div>
        )}
      </form>

      <DeviationsBlock deviations={deviations} normMissing={normMissing} />
    </div>
  );
}

/** Отклонения от нормативов — тексты бэка (get_deviations) как есть. */
export function DeviationsBlock({ deviations, normMissing }: { deviations: RationDeviation[]; normMissing: boolean }) {
  if (normMissing) {
    return (
      <div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-sm text-amber-900">
        Для этого типа рациона норма не задана, поэтому отклонения не проверяются.{' '}
        <Link href="/ration/norms" className="underline font-medium">Задать норму</Link>
      </div>
    );
  }
  if (deviations.length === 0) {
    return (
      <div className="bg-green-50 border-l-4 border-green-600 p-3 text-sm text-green-900">
        Отклонений от нормативов не обнаружено.
      </div>
    );
  }
  return (
    <div className="bg-red-50 border-l-4 border-red-600 p-4">
      <p className="text-sm font-semibold text-red-800 mb-2">Обнаружены отклонения ({deviations.length})</p>
      <ul className="space-y-1 text-sm text-red-800 list-disc pl-5">
        {deviations.map((d, i) => <li key={`${d.nutrient}-${i}`}>{d.message}</li>)}
      </ul>
    </div>
  );
}
