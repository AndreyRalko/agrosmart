'use client';

import { useState, useEffect, FormEvent } from 'react';
import {
  getNotificationSettings,
  createNotificationSetting,
  updateNotificationSetting,
  deleteNotificationSetting,
} from '@/lib/api/notification/notification-setting';
import { getFields } from '@/lib/api/field/field';
import { getAgroOperations } from '@/lib/api/agro-operations/operation';
import { getVarietiesByCulture } from '@/lib/api/culture-operations/custom-variety';
import { getCultures } from '@/lib/api/culture-operations/culture';
import type { NotificationSetting, NotificationSettingCreate } from '@/lib/types/notification/notification-setting';

interface SelectOption {
  id: number;
  label: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const DEFAULT_FORM: NotificationSettingCreate = {
  type: 'optimal_conditions',
  params: { field_id: 0, operation_id: 0, culture_variety_id: 0 },
  every_minute: 15,
  min_look_ahead_hours: 1,
  look_ahead_hours: 6,
  active_from_hour: 6,
  is_active: true,
};

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<NotificationSettingCreate>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [fields, setFields] = useState<SelectOption[]>([]);
  const [operations, setOperations] = useState<SelectOption[]>([]);
  const [cultures, setCultures] = useState<SelectOption[]>([]);
  const [varieties, setVarieties] = useState<SelectOption[]>([]);
  const [selectedCulture, setSelectedCulture] = useState('');
  const [loadingVarieties, setLoadingVarieties] = useState(false);

  useEffect(() => {
    loadSettings();
    loadDictionaries();
  }, []);

  useEffect(() => {
    if (!selectedCulture) { setVarieties([]); return; }
    loadVarieties(Number(selectedCulture));
  }, [selectedCulture]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getNotificationSettings();
      setSettings(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки настроек');
    } finally {
      setLoading(false);
    }
  };

  const loadDictionaries = async () => {
    try {
      const [fieldsRes, opsRes, culturesRes] = await Promise.all([
        getFields(),
        getAgroOperations(),
        getCultures(),
      ]);
      setFields((fieldsRes.results || []).map(f => ({ id: f.id, label: `Поле №${f.no}` })));
      setOperations((opsRes.results || []).map(o => ({ id: o.id, label: o.name_ru || o.name })));
      setCultures((culturesRes.results || []).map(c => ({ id: c.id, label: c.name_ru || c.name })));
    } catch (err) {
      console.error('Ошибка загрузки справочников', err);
    }
  };

  const loadVarieties = async (cultureId: number) => {
    setLoadingVarieties(true);
    try {
      const res = await getVarietiesByCulture(cultureId);
      setVarieties((res.results || []).map(v => ({ id: v.id, label: v.name_ru || v.name })));
    } catch {
      setVarieties([]);
    } finally {
      setLoadingVarieties(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData(DEFAULT_FORM);
    setSelectedCulture('');
    setVarieties([]);
    setFormError('');
    setIsFormOpen(true);
  };

  const openEdit = (s: NotificationSetting) => {
    setEditingId(s.id);
    setFormData({
      type: 'optimal_conditions',
      params: { ...s.params },
      every_minute: s.every_minute,
      min_look_ahead_hours: s.min_look_ahead_hours,
      look_ahead_hours: s.look_ahead_hours,
      active_from_hour: s.active_from_hour,
      is_active: s.is_active,
    });
    setSelectedCulture('');
    setVarieties([]);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleToggleActive = async (s: NotificationSetting) => {
    try {
      const updated = await updateNotificationSetting(s.id, { is_active: !s.is_active });
      setSettings(prev => prev.map(item => item.id === s.id ? updated : item));
    } catch {
      alert('Не удалось изменить статус');
    }
  };

  const handleDelete = async (s: NotificationSetting) => {
    if (!confirm('Удалить настройку уведомления?')) return;
    try {
      await deleteNotificationSetting(s.id);
      setSettings(prev => prev.filter(item => item.id !== s.id));
    } catch {
      alert('Не удалось удалить');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.params.field_id || !formData.params.operation_id || !formData.params.culture_variety_id) {
      setFormError('Выберите поле, операцию и сорт');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editingId) {
        const updated = await updateNotificationSetting(editingId, {
          every_minute: formData.every_minute,
          min_look_ahead_hours: formData.min_look_ahead_hours,
          look_ahead_hours: formData.look_ahead_hours,
          active_from_hour: formData.active_from_hour,
          is_active: formData.is_active,
        });
        setSettings(prev => prev.map(item => item.id === editingId ? updated : item));
      } else {
        const created = await createNotificationSetting(formData);
        setSettings(prev => [created, ...prev]);
      }
      setIsFormOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 mb-1">Настройки уведомлений</h1>
          <p className="text-sm text-neutral-500">
            Система проверяет условия агроопераций по расписанию и уведомляет при достижении оптимальных условий.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="shrink-0 ml-4 px-4 py-2 text-white text-sm font-medium rounded flex items-center gap-2"
          style={{ backgroundColor: '#16a34a' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#15803d')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#16a34a')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Добавить
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-neutral-900" />
        </div>
      )}

      {error && !loading && (
        <div className="p-3 bg-red-50 border-l-4 border-red-600 text-red-800 text-sm mb-4">{error}</div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {settings.length === 0 && (
            <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
              <p className="text-neutral-400 text-sm mb-1">Нет настроек уведомлений</p>
              <p className="text-neutral-400 text-xs">Добавьте настройку чтобы получать уведомления об оптимальных условиях</p>
            </div>
          )}

          {settings.map(s => {
            const fieldLabel = fields.find(f => f.id === s.params.field_id)?.label ?? `Поле #${s.params.field_id}`;
            const opLabel = operations.find(o => o.id === s.params.operation_id)?.label ?? `Операция #${s.params.operation_id}`;

            return (
              <div key={s.id} className="bg-white border border-neutral-200 rounded-lg p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: s.is_active ? '#22c55e' : '#d1d5db' }}
                      />
                      <h3 className="text-base font-semibold text-neutral-900">{opLabel}</h3>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={s.is_active
                          ? { backgroundColor: '#f0fdf4', color: '#15803d' }
                          : { backgroundColor: '#f5f5f5', color: '#737373' }
                        }
                      >
                        {s.is_active ? 'Активно' : 'Отключено'}
                      </span>
                    </div>

                    <p className="text-sm text-neutral-600 mb-3">{fieldLabel}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { label: 'Интервал', value: `каждые ${s.every_minute} мин` },
                        { label: 'Горизонт', value: `${s.look_ahead_hours} ч` },
                        { label: 'Мин. горизонт', value: `${s.min_look_ahead_hours} ч` },
                        { label: 'Активен с', value: `${s.active_from_hour}:00` },
                      ].map(item => (
                        <div key={item.label} className="bg-neutral-50 border border-neutral-100 rounded px-3 py-2">
                          <p className="text-xs text-neutral-400 mb-0.5">{item.label}</p>
                          <p className="text-sm font-medium text-neutral-800">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-neutral-400 mt-3">Создано: {formatDate(s.created_at)}</p>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleActive(s)}
                      className="px-3 py-1.5 text-xs font-medium border rounded transition-colors"
                      style={s.is_active
                        ? { borderColor: '#e5e7eb', color: '#6b7280' }
                        : { borderColor: '#16a34a', color: '#16a34a', backgroundColor: '#f0fdf4' }
                      }
                    >
                      {s.is_active ? 'Отключить' : 'Включить'}
                    </button>
                    <button
                      onClick={() => openEdit(s)}
                      className="px-3 py-1.5 text-xs font-medium border border-neutral-200 text-neutral-600 rounded hover:bg-neutral-50"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      className="px-3 py-1.5 text-xs font-medium rounded"
                      style={{ backgroundColor: '#fff5f5', color: '#dc2626', border: '1px solid #fecaca' }}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Модалка */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-neutral-200">
              <h2 className="text-lg font-semibold text-neutral-900">
                {editingId ? 'Редактировать настройку' : 'Новая настройка уведомления'}
              </h2>
              <button onClick={() => setIsFormOpen(false)} className="text-neutral-400 hover:text-neutral-900">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border-l-4 border-red-600 text-red-800 text-sm">{formError}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Поле <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.params.field_id || ''}
                  onChange={e => setFormData(prev => ({ ...prev, params: { ...prev.params, field_id: Number(e.target.value) } }))}
                  disabled={!!editingId}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 disabled:bg-neutral-50 disabled:text-neutral-400"
                >
                  <option value="">Выберите поле</option>
                  {fields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>

              {!editingId && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                      Культура <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedCulture}
                      onChange={e => {
                        setSelectedCulture(e.target.value);
                        setFormData(prev => ({ ...prev, params: { ...prev.params, culture_variety_id: 0 } }));
                      }}
                      className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900"
                    >
                      <option value="">Выберите культуру</option>
                      {cultures.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                      Сорт <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.params.culture_variety_id || ''}
                      onChange={e => setFormData(prev => ({ ...prev, params: { ...prev.params, culture_variety_id: Number(e.target.value) } }))}
                      disabled={!selectedCulture || loadingVarieties}
                      className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 disabled:bg-neutral-50 disabled:text-neutral-400"
                    >
                      <option value="">
                        {loadingVarieties ? 'Загрузка...' : !selectedCulture ? 'Сначала выберите культуру' : 'Выберите сорт'}
                      </option>
                      {varieties.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                      Агрооперация <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.params.operation_id || ''}
                      onChange={e => setFormData(prev => ({ ...prev, params: { ...prev.params, operation_id: Number(e.target.value) } }))}
                      className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900"
                    >
                      <option value="">Выберите операцию</option>
                      {operations.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div className="border-t border-neutral-100 pt-4">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Расписание</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Интервал (мин)', key: 'every_minute', min: 1, max: 1440 },
                    { label: 'Активен с (час)', key: 'active_from_hour', min: 0, max: 23 },
                    { label: 'Горизонт прогноза (ч)', key: 'look_ahead_hours', min: 1, max: 168 },
                    { label: 'Мин. горизонт (ч)', key: 'min_look_ahead_hours', min: 1, max: 168 },
                  ].map(({ label, key, min, max }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
                      <input
                        type="number" min={min} max={max}
                        value={formData[key as keyof NotificationSettingCreate] as number}
                        onChange={e => setFormData(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                        className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox" id="is_active"
                  checked={formData.is_active}
                  onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-neutral-700">Активно</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setIsFormOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Отмена
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-400"
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}