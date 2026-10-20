'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { addStorageSensor, getStorageSensors } from '@/lib/api/storage/storage';
import { parseDrfError } from '@/lib/utils/drf-errors';
import type { StorageSensor, StorageSensorCreate } from '@/lib/types/storage/storage';
import LineChart from '@/components/ui/LineChart';
import { StatusBadge } from './ui';
import {
  ErrorBox, FieldError, formatDateTime, formatNumber,
  inputClass, inputErrorClass, primaryButtonClass, secondaryButtonClass, tdClass, thClass,
} from '@/components/ui/form';

const PAGE = 20;
// Пороги статуса warning из backend/storage/models.py (StorageSensor.status).
const TEMP_LIMIT = 25;
const HUMIDITY_LIMIT = 80;

interface SensorsTabProps {
  storageId: number;
  /** Вызывается после добавления показания: у объекта меняются статус и latest_sensor. */
  onChanged: () => void;
}

export default function SensorsTab({ storageId, onChanged }: SensorsTabProps) {
  const [sensors, setSensors] = useState<StorageSensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(PAGE);

  const [temperature, setTemperature] = useState('');
  const [humidity, setHumidity] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const load = async () => {
    setError('');
    try {
      setSensors(await getStorageSensors(storageId));
    } catch (err) {
      setError(parseDrfError(err, [], 'Не удалось загрузить показания').message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [storageId]);

  // Бэк отдаёт показания от новых к старым; для графика нужен прямой порядок.
  const series = useMemo(() => {
    const asc = [...sensors].reverse();
    const toPoints = (key: 'temperature' | 'humidity') =>
      asc
        .filter(s => s[key] !== null && s[key] !== '')
        .map(s => ({ t: new Date(s.created_at).getTime(), v: Number(s[key]) }))
        .filter(p => Number.isFinite(p.t) && Number.isFinite(p.v));
    return { temperature: toPoints('temperature'), humidity: toPoints('humidity') };
  }, [sensors]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});
    if (temperature === '' && humidity === '') {
      setFormError('Укажите температуру и/или влажность');
      return;
    }
    // Бэк запишет 0 в незаполненное поле, а 0 % влажности исказит график и статус.
    // Поэтому просим заполнить оба значения.
    if (temperature === '' || humidity === '') {
      setFormError('Заполните оба значения: если одно не указать, бэкенд сохранит его как 0');
      return;
    }
    const payload: StorageSensorCreate = { temperature, humidity };
    setSaving(true);
    try {
      await addStorageSensor(storageId, payload);
      setTemperature('');
      setHumidity('');
      await load();
      onChanged();
    } catch (err) {
      const parsed = parseDrfError(err, ['temperature', 'humidity'], 'Не удалось сохранить показание');
      setFieldErrors(parsed.fields);
      setFormError(parsed.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-neutral-500">Загрузка...</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LineChart title="Температура" unit="°C" color="#dc2626" points={series.temperature} threshold={TEMP_LIMIT} />
        <LineChart title="Влажность" unit="%" color="#2563eb" points={series.humidity} threshold={HUMIDITY_LIMIT} />
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 p-4" noValidate>
        <p className="text-sm font-medium text-neutral-900 mb-3">Добавить показание вручную</p>
        <ErrorBox message={formError} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">Температура, °C</label>
            <input type="number" step="0.1" value={temperature} onChange={e => setTemperature(e.target.value)}
              className={fieldErrors.temperature ? inputErrorClass : inputClass} />
            <FieldError message={fieldErrors.temperature} />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">Влажность, %</label>
            <input type="number" step="0.1" min="0" max="100" value={humidity} onChange={e => setHumidity(e.target.value)}
              className={fieldErrors.humidity ? inputErrorClass : inputClass} />
            <FieldError message={fieldErrors.humidity} />
          </div>
          <div className="sm:pt-6">
            <button type="submit" disabled={saving} className={`${primaryButtonClass} w-full`}>
              {saving ? 'Сохранение...' : 'Добавить'}
            </button>
          </div>
        </div>
      </form>

      {error ? (
        <div className="bg-white border border-neutral-200 p-4">
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button onClick={() => { setLoading(true); load(); }} className={secondaryButtonClass}>Повторить</button>
        </div>
      ) : sensors.length === 0 ? (
        <div className="bg-white border border-neutral-200 p-8 text-center text-sm text-neutral-500">Показаний пока нет</div>
      ) : (
        <div className="bg-white border border-neutral-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className={thClass}>Время</th>
                <th className={thClass}>Устройство</th>
                <th className={thClass}>t, °C</th>
                <th className={thClass}>Влажность, %</th>
                <th className={thClass}>Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {sensors.slice(0, visible).map(s => (
                <tr key={s.id} className="hover:bg-neutral-50">
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDateTime(s.created_at)}</td>
                  <td className={tdClass}>
                    {s.device ? s.device.name : <span className="text-neutral-400">Вручную</span>}
                  </td>
                  <td className={tdClass}>{formatNumber(s.temperature, 1)}</td>
                  <td className={tdClass}>{formatNumber(s.humidity, 1)}</td>
                  <td className={tdClass}><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {sensors.length > visible && (
            <div className="p-3 border-t border-neutral-200 text-center">
              <button onClick={() => setVisible(v => v + PAGE)} className={secondaryButtonClass}>
                Показать ещё ({sensors.length - visible})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
