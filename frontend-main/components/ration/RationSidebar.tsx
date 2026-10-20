'use client';

import { useEffect, useState, FormEvent } from 'react';
import { createRation, updateRation, RATION_TYPE_LABELS } from '@/lib/api/ration/ration';
import { FEED_TYPE_LABELS, getStorageObjects } from '@/lib/api/storage/storage';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { rationErrorMessage } from '@/lib/utils/ration';
import type { Ration, RationType, RationWrite } from '@/lib/types/ration/ration';
import type { StorageObject } from '@/lib/types/storage/storage';
import SidePanel from '@/components/ui/SidePanel';
import { ErrorBox, FieldError, inputClass, inputErrorClass } from '@/components/ui/form';
import { AnimalSelect } from './animals';

/** create — новый рацион; edit — все поля; assign — только назначение (животное, голов, период). */
export type RationSidebarMode = 'create' | 'edit' | 'assign';

interface RationSidebarProps {
  isOpen: boolean;
  mode: RationSidebarMode;
  ration: Ration | null;
  /** Подпись животного рациона (бирка), если уже известна. */
  animalLabel: string | null;
  onClose: () => void;
  onSaved: (ration: Ration) => void;
}

interface FormState {
  name: string;
  ration_type: RationType;
  animal_group: number | null;
  animal_count: string;
  date_start: string;
  date_end: string;
  notes: string;
  is_active: boolean;
}

const FIELDS = ['name', 'ration_type', 'animal_group', 'animal_count', 'date_start', 'date_end', 'notes', 'is_active', 'items'];

interface StorageLine {
  key: number;
  storageId: string;
  kg: string;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function initialForm(ration: Ration | null): FormState {
  if (!ration) {
    return {
      name: '', ration_type: 'dairy', animal_group: null, animal_count: '1',
      date_start: today(), date_end: '', notes: '', is_active: true,
    };
  }
  return {
    name: ration.name,
    ration_type: ration.ration_type,
    animal_group: ration.animal_group,
    animal_count: String(ration.animal_count),
    date_start: ration.date_start,
    date_end: ration.date_end ?? '',
    notes: ration.notes ?? '',
    is_active: ration.is_active,
  };
}

const TITLES: Record<RationSidebarMode, string> = {
  create: 'Новый рацион',
  edit: 'Редактировать рацион',
  assign: 'Назначить рацион',
};

export default function RationSidebar({ isOpen, mode, ration, animalLabel, onClose, onSaved }: RationSidebarProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(initialForm(null));
  const [animalText, setAnimalText] = useState<string | null>(null);
  const [lines, setLines] = useState<StorageLine[]>([{ key: 1, storageId: '', kg: '' }]);
  const [storages, setStorages] = useState<StorageObject[]>([]);
  const [storagesError, setStoragesError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setForm(initialForm(mode === 'create' ? null : ration));
    setAnimalText(mode === 'create' ? null : animalLabel);
    setLines([{ key: 1, storageId: '', kg: '' }]);
    setError('');
    setFieldErrors({});
    if (mode !== 'create') return;
    getStorageObjects()
      .then(list => { setStorages(list); setStoragesError(''); })
      .catch(() => setStoragesError('Не удалось загрузить склады'));
  }, [isOpen, mode, ration, animalLabel]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (mode !== 'assign' && !form.name.trim()) errs.name = 'Обязательное поле';
    const count = Number(form.animal_count);
    if (!Number.isInteger(count) || count < 1) errs.animal_count = 'Укажите целое число голов, не меньше 1';
    if (!form.date_start) errs.date_start = 'Укажите дату начала';
    if (form.date_start && form.date_end && form.date_end < form.date_start) {
      errs.date_end = 'Дата окончания не может быть раньше даты начала';
    }
    if (mode === 'create') {
      const picked = new Set<string>();
      lines.forEach((line, index) => {
        if (!line.storageId && !line.kg) return;
        if (!line.storageId) errs[`line-${index}-storage`] = 'Выберите склад';
        const kg = Number(line.kg);
        if (!line.kg || !Number.isFinite(kg) || kg <= 0) errs[`line-${index}-kg`] = 'Укажите килограммы больше 0';
        if (line.storageId && picked.has(line.storageId)) errs[`line-${index}-storage`] = 'Этот склад уже добавлен';
        if (line.storageId) picked.add(line.storageId);
      });
    }
    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    const assignment = {
      animal_group: form.animal_group,
      animal_count: Number(form.animal_count),
      date_start: form.date_start,
      date_end: form.date_end || null,
    };
    const items = lines
      .filter(line => line.storageId && line.kg)
      .map(line => ({ storage_id: Number(line.storageId), quantity_kg: line.kg }));
    const full: RationWrite = {
      ...assignment,
      name: form.name.trim(),
      ration_type: form.ration_type,
      notes: form.notes,
      is_active: form.is_active,
      ...(mode === 'create' && items.length ? { items } : {}),
    };

    setSaving(true);
    setError('');
    try {
      const saved = mode === 'create' || !ration
        ? await createRation(full)
        : await updateRation(ration.id, mode === 'assign' ? assignment : full);
      onSaved(saved);
      onClose();
    } catch (err) {
      const parsed = rationErrorMessage(err, 'Не удалось сохранить рацион', FIELDS);
      setFieldErrors(parsed.fields);
      setError(parsed.message);
    } finally {
      setSaving(false);
    }
  };

  const cls = (key: string) => (fieldErrors[key] ? inputErrorClass : inputClass);
  const label = 'block text-sm font-medium text-neutral-700 mb-1.5';

  return (
    <SidePanel isOpen={isOpen} title={TITLES[mode]} onClose={onClose}>
      <ErrorBox message={error} />
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {mode !== 'assign' && (
          <>
            <div>
              <label className={label}>Название {t('requiredField')}</label>
              <input type="text" maxLength={255} value={form.name} onChange={e => set('name', e.target.value)} className={cls('name')} />
              <FieldError message={fieldErrors.name} />
            </div>
            <div>
              <label className={label}>Тип рациона</label>
              <select value={form.ration_type} onChange={e => set('ration_type', e.target.value as RationType)} className={cls('ration_type')}>
                {(Object.keys(RATION_TYPE_LABELS) as RationType[]).map(k => (
                  <option key={k} value={k}>{RATION_TYPE_LABELS[k]}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-neutral-500">От типа зависит, с какой нормой сравнивается питательность.</p>
              <FieldError message={fieldErrors.ration_type} />
            </div>
          </>
        )}

        {mode === 'assign' && ration && (
          <p className="text-sm text-neutral-600">Рацион: <span className="font-medium text-neutral-900">{ration.name}</span></p>
        )}

        <div>
          <label className={label}>Животное (необязательно)</label>
          <AnimalSelect
            value={form.animal_group}
            valueLabel={animalText}
            onChange={(id, text) => { set('animal_group', id); setAnimalText(text); }}
            error={!!fieldErrors.animal_group}
          />
          <p className="mt-1 text-xs text-neutral-500">
            Сейчас рацион можно привязать только к одному животному. Размер группы задаётся полем «Голов» — от него считаются затраты.
          </p>
          <FieldError message={fieldErrors.animal_group} />
        </div>

        <div>
          <label className={label}>Голов {t('requiredField')}</label>
          <input type="number" min="1" step="1" value={form.animal_count} onChange={e => set('animal_count', e.target.value)} className={cls('animal_count')} />
          <FieldError message={fieldErrors.animal_count} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Начало {t('requiredField')}</label>
            <input type="date" value={form.date_start} onChange={e => set('date_start', e.target.value)} className={cls('date_start')} />
            <FieldError message={fieldErrors.date_start} />
          </div>
          <div>
            <label className={label}>Окончание</label>
            <input type="date" value={form.date_end} min={form.date_start || undefined} onChange={e => set('date_end', e.target.value)} className={cls('date_end')} />
            <FieldError message={fieldErrors.date_end} />
          </div>
        </div>

        {mode !== 'assign' && (
          <>
            {mode === 'create' && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">Склады</p>
                  <p className="mt-1 text-xs text-neutral-500">Корм берётся из модуля хранения. Килограммы — на 1 голову в сутки.</p>
                </div>
                <ErrorBox message={storagesError} />
                {storages.length === 0 && !storagesError ? (
                  <p className="text-sm text-neutral-500">Складов пока нет. Сначала создайте их в «Хранении кормов».</p>
                ) : lines.map((line, index) => {
                  const taken = new Set(lines.filter(other => other.key !== line.key).map(other => other.storageId));
                  return (
                    <div key={line.key} className="grid grid-cols-[1fr_96px_auto] gap-2 items-start">
                      <div>
                        <select
                          value={line.storageId}
                          onChange={e => setLines(prev => prev.map(item => item.key === line.key ? { ...item, storageId: e.target.value } : item))}
                          className={fieldErrors[`line-${index}-storage`] ? inputErrorClass : inputClass}
                        >
                          <option value="">Склад</option>
                          {storages.filter(s => s.id === Number(line.storageId) || !taken.has(String(s.id))).map(s => (
                            <option key={s.id} value={s.id}>{s.name} · {FEED_TYPE_LABELS[s.feed_type]}</option>
                          ))}
                        </select>
                        <FieldError message={fieldErrors[`line-${index}-storage`]} />
                      </div>
                      <div>
                        <input
                          type="number" min="0" step="0.001" placeholder="кг"
                          value={line.kg}
                          onChange={e => setLines(prev => prev.map(item => item.key === line.key ? { ...item, kg: e.target.value } : item))}
                          className={fieldErrors[`line-${index}-kg`] ? inputErrorClass : inputClass}
                        />
                        <FieldError message={fieldErrors[`line-${index}-kg`]} />
                      </div>
                      <button
                        type="button"
                        onClick={() => setLines(prev => prev.length === 1 ? [{ key: line.key, storageId: '', kg: '' }] : prev.filter(item => item.key !== line.key))}
                        className="px-2 py-2.5 text-sm text-neutral-500 hover:text-neutral-900"
                        aria-label="Убрать склад"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
                {storages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setLines(prev => [...prev, { key: Date.now(), storageId: '', kg: '' }])}
                    className="text-sm font-medium text-neutral-900 hover:underline"
                  >
                    Добавить склад
                  </button>
                )}
              </div>
            )}
            <div>
              <label className={label}>Примечания</label>
              <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} className={cls('notes')} />
              <FieldError message={fieldErrors.notes} />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
              Активен (снимите, чтобы отправить в архив)
            </label>
          </>
        )}

        <div className="flex gap-3 pt-6">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
            {t('cancel')}
          </button>
          <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors">
            {saving ? t('saving') : mode === 'create' ? t('create') : t('save')}
          </button>
        </div>
      </form>
    </SidePanel>
  );
}
