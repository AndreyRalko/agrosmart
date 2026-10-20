'use client';

import { useEffect, useState, FormEvent } from 'react';
import {
  createSensorDevice, deleteSensorDevice, getSensorDevices, updateSensorDevice,
} from '@/lib/api/storage/storage';
import { parseDrfError } from '@/lib/utils/drf-errors';
import type { SensorDevice } from '@/lib/types/storage/storage';
import {
  ErrorBox, FieldError, formatDateTime, inputClass, inputErrorClass,
  primaryButtonClass, secondaryButtonClass, tdClass, thClass,
} from '@/components/ui/form';

const FIELDS = ['name', 'device_id', 'is_active'];

interface DeviceForm {
  name: string;
  device_id: string;
  is_active: boolean;
}

const emptyForm: DeviceForm = { name: '', device_id: '', is_active: true };

export default function DevicesTab({ storageId }: { storageId: number }) {
  const [devices, setDevices] = useState<SensorDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  // editingId: null — форма закрыта, 0 — создание, иначе id редактируемого устройства
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<DeviceForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    setError('');
    try {
      setDevices(await getSensorDevices(storageId));
    } catch (err) {
      setError(parseDrfError(err, [], 'Не удалось загрузить устройства').message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [storageId]);

  const openCreate = () => {
    setEditingId(0);
    setForm(emptyForm);
    setFormError('');
    setFieldErrors({});
  };

  const openEdit = (d: SensorDevice) => {
    setEditingId(d.id);
    setForm({ name: d.name, device_id: d.device_id, is_active: d.is_active });
    setFormError('');
    setFieldErrors({});
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Обязательное поле';
    if (!form.device_id.trim()) errs.device_id = 'Обязательное поле';
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const data = { name: form.name.trim(), device_id: form.device_id.trim(), is_active: form.is_active };
      if (editingId) {
        await updateSensorDevice(storageId, editingId, data);
      } else {
        await createSensorDevice(storageId, { storage: storageId, ...data });
      }
      setEditingId(null);
      await load();
    } catch (err) {
      const parsed = parseDrfError(err, FIELDS, 'Не удалось сохранить устройство');
      setFieldErrors(parsed.fields);
      setFormError(parsed.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (d: SensorDevice) => {
    setBusyId(d.id);
    setActionError('');
    try {
      const updated = await updateSensorDevice(storageId, d.id, { is_active: !d.is_active });
      setDevices(prev => prev.map(x => (x.id === d.id ? updated : x)));
    } catch (err) {
      setActionError(parseDrfError(err, [], 'Не удалось изменить статус устройства').message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (d: SensorDevice) => {
    if (!confirm(`Удалить устройство «${d.name}»? Его показания останутся, но без привязки к устройству.`)) return;
    setBusyId(d.id);
    setActionError('');
    try {
      await deleteSensorDevice(storageId, d.id);
      if (editingId === d.id) setEditingId(null);
      await load();
    } catch (err) {
      setActionError(parseDrfError(err, [], 'Не удалось удалить устройство').message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <p className="text-sm text-neutral-500">Загрузка...</p>;

  if (error) {
    return (
      <div className="bg-white border border-neutral-200 p-4">
        <p className="text-sm text-red-600 mb-3">{error}</p>
        <button onClick={() => { setLoading(true); load(); }} className={secondaryButtonClass}>Повторить</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500">
          Устройство также регистрируется автоматически при первой отправке показания в формате {'{name, type, value}'}.
        </p>
        {editingId === null && (
          <button onClick={openCreate} className={primaryButtonClass}>Добавить устройство</button>
        )}
      </div>

      {editingId !== null && (
        <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 p-4" noValidate>
          <p className="text-sm font-medium text-neutral-900 mb-3">
            {editingId ? 'Редактировать устройство' : 'Новое устройство'}
          </p>
          <ErrorBox message={formError} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Название *</label>
              <input type="text" maxLength={255} value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className={fieldErrors.name ? inputErrorClass : inputClass} />
              <FieldError message={fieldErrors.name} />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">ID устройства *</label>
              <input type="text" maxLength={255} value={form.device_id}
                onChange={e => setForm({ ...form, device_id: e.target.value })}
                className={fieldErrors.device_id ? inputErrorClass : inputClass} />
              <FieldError message={fieldErrors.device_id} />
            </div>
            <div className="flex items-center sm:pt-6">
              <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
                <input type="checkbox" checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                Активно
              </label>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={saving} className={primaryButtonClass}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button type="button" onClick={() => setEditingId(null)} className={secondaryButtonClass}>Отмена</button>
          </div>
        </form>
      )}

      <ErrorBox message={actionError} />

      {devices.length === 0 ? (
        <div className="bg-white border border-neutral-200 p-8 text-center text-sm text-neutral-500">Устройств пока нет</div>
      ) : (
        <div className="bg-white border border-neutral-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className={thClass}>Название</th>
                <th className={thClass}>ID устройства</th>
                <th className={thClass}>Статус</th>
                <th className={thClass}>Последняя связь</th>
                <th className={thClass}>Добавлено</th>
                <th className={thClass}>Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {devices.map(d => (
                <tr key={d.id} className="hover:bg-neutral-50">
                  <td className={`${tdClass} font-medium`}>{d.name}</td>
                  <td className={`${tdClass} font-mono text-xs`}>{d.device_id}</td>
                  <td className={tdClass}>
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium border ${d.is_active
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-neutral-100 text-neutral-600 border-neutral-200'}`}>
                      {d.is_active ? 'Активно' : 'Отключено'}
                    </span>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDateTime(d.last_seen)}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDateTime(d.created_at)}</td>
                  <td className={`${tdClass} whitespace-nowrap text-xs`}>
                    <button onClick={() => toggleActive(d)} disabled={busyId === d.id} className="text-neutral-600 hover:text-neutral-900 mr-3 disabled:text-neutral-300">
                      {d.is_active ? 'Отключить' : 'Включить'}
                    </button>
                    <button onClick={() => openEdit(d)} disabled={busyId === d.id} className="text-neutral-600 hover:text-neutral-900 mr-3 disabled:text-neutral-300">
                      Изменить
                    </button>
                    <button onClick={() => handleDelete(d)} disabled={busyId === d.id} className="text-red-600 hover:text-red-700 disabled:text-neutral-300">
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
