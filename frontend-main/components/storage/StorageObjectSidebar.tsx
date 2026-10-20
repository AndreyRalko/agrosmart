'use client';

import { useEffect, useState, FormEvent } from 'react';
import {
  createStorageObject, updateStorageObject, deleteStorageObject,
  FEED_TYPE_LABELS, UNIT_LABELS,
} from '@/lib/api/storage/storage';
import { getCultures } from '@/lib/api/culture-operations/culture';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { parseDrfError } from '@/lib/utils/drf-errors';
import type { FeedType, StorageObject, StorageObjectWrite, StorageUnit } from '@/lib/types/storage/storage';
import { ErrorBox, FieldError, inputClass, inputErrorClass } from '@/components/ui/form';
import SidePanel from '@/components/ui/SidePanel';

interface StorageObjectSidebarProps {
  isOpen: boolean;
  /** null — создание, иначе редактирование. */
  object: StorageObject | null;
  onClose: () => void;
  onSaved: (obj: StorageObject) => void;
  /** Если не передан, кнопка удаления не показывается. */
  onDeleted?: () => void;
}

interface FormState {
  name: string;
  location: string;
  feed_type: FeedType;
  culture: string;
  unit: StorageUnit;
  current_amount: string;
  max_capacity: string;
  notes: string;
}

const FIELDS: (keyof FormState)[] = [
  'name', 'location', 'feed_type', 'culture', 'unit', 'current_amount', 'max_capacity', 'notes',
];

const emptyForm: FormState = {
  name: '', location: '', feed_type: 'hay', culture: '', unit: 't',
  current_amount: '0', max_capacity: '', notes: '',
};

function fromObject(o: StorageObject): FormState {
  return {
    name: o.name,
    location: o.location,
    feed_type: o.feed_type,
    culture: o.culture ?? '',
    unit: o.unit,
    current_amount: o.current_amount,
    max_capacity: o.max_capacity,
    notes: o.notes ?? '',
  };
}

export default function StorageObjectSidebar({ isOpen, object, onClose, onSaved, onDeleted }: StorageObjectSidebarProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [cultureNames, setCultureNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setForm(object ? fromObject(object) : emptyForm);
    setError('');
    setFieldErrors({});
    // Подсказки для поля «Культура». На бэке это свободный текст, не FK.
    getCultures(100)
      .then(data => setCultureNames((data.results || []).map(c => c.name).filter(Boolean)))
      .catch(() => setCultureNames([]));
  }, [isOpen, object]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    const current = Number(form.current_amount || 0);
    const max = Number(form.max_capacity);
    if (!form.name.trim()) errs.name = 'Обязательное поле';
    if (!form.location.trim()) errs.location = 'Обязательное поле';
    if (form.max_capacity === '' || !Number.isFinite(max)) errs.max_capacity = 'Укажите вместимость';
    else if (max <= 0) errs.max_capacity = 'Вместимость должна быть больше нуля';
    if (!Number.isFinite(current) || current < 0) errs.current_amount = 'Запас не может быть отрицательным';
    else if (Number.isFinite(max) && current > max) errs.current_amount = 'Запас не может превышать вместимость';
    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    const payload: StorageObjectWrite = {
      name: form.name.trim(),
      location: form.location.trim(),
      feed_type: form.feed_type,
      culture: form.culture.trim(),
      unit: form.unit,
      current_amount: form.current_amount || '0',
      max_capacity: form.max_capacity,
      notes: form.notes,
    };

    setLoading(true);
    setError('');
    try {
      const saved = object
        ? await updateStorageObject(object.id, payload)
        : await createStorageObject(payload);
      onSaved(saved);
      onClose();
    } catch (err) {
      const parsed = parseDrfError(err, FIELDS, 'Не удалось сохранить объект');
      setFieldErrors(parsed.fields);
      setError(parsed.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!object || !onDeleted) return;
    if (!confirm(`Удалить объект «${object.name}»? Будут удалены также показания, устройства и анализы.`)) return;
    setLoading(true);
    setError('');
    try {
      await deleteStorageObject(object.id);
      onDeleted();
      onClose();
    } catch (err) {
      setError(parseDrfError(err, [], 'Не удалось удалить объект').message);
    } finally {
      setLoading(false);
    }
  };

  const cls = (key: string) => (fieldErrors[key] ? inputErrorClass : inputClass);

  return (
    <SidePanel
      isOpen={isOpen}
      title={object ? 'Редактировать объект хранения' : 'Новый объект хранения'}
      onClose={onClose}
    >
      <ErrorBox message={error} />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Название {t('requiredField')}</label>
          <input type="text" maxLength={255} value={form.name} onChange={e => set('name', e.target.value)} className={cls('name')} />
          <FieldError message={fieldErrors.name} />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Локация {t('requiredField')}</label>
          <input type="text" maxLength={255} value={form.location} onChange={e => set('location', e.target.value)} className={cls('location')} />
          <FieldError message={fieldErrors.location} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Тип корма {t('requiredField')}</label>
            <select value={form.feed_type} onChange={e => set('feed_type', e.target.value as FeedType)} className={cls('feed_type')}>
              {(Object.keys(FEED_TYPE_LABELS) as FeedType[]).map(k => (
                <option key={k} value={k}>{FEED_TYPE_LABELS[k]}</option>
              ))}
            </select>
            <FieldError message={fieldErrors.feed_type} />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Единица</label>
            <select value={form.unit} onChange={e => set('unit', e.target.value as StorageUnit)} className={cls('unit')}>
              {(Object.keys(UNIT_LABELS) as StorageUnit[]).map(k => (
                <option key={k} value={k}>{UNIT_LABELS[k]}</option>
              ))}
            </select>
            <FieldError message={fieldErrors.unit} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Культура</label>
          <input
            type="text"
            list="storage-culture-options"
            maxLength={255}
            value={form.culture}
            onChange={e => set('culture', e.target.value)}
            placeholder="Выберите из списка или введите"
            className={cls('culture')}
          />
          <datalist id="storage-culture-options">
            {cultureNames.map(name => <option key={name} value={name} />)}
          </datalist>
          <FieldError message={fieldErrors.culture} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Текущий запас</label>
            <input type="number" min="0" step="0.01" value={form.current_amount} onChange={e => set('current_amount', e.target.value)} className={cls('current_amount')} />
            <FieldError message={fieldErrors.current_amount} />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Вместимость {t('requiredField')}</label>
            <input type="number" min="0" step="0.01" value={form.max_capacity} onChange={e => set('max_capacity', e.target.value)} className={cls('max_capacity')} />
            <FieldError message={fieldErrors.max_capacity} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Примечания</label>
          <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} className={cls('notes')} />
          <FieldError message={fieldErrors.notes} />
        </div>

        {object && onDeleted && (
          <div className="pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors disabled:bg-neutral-100 disabled:text-neutral-400"
            >
              {t('delete')} объект
            </button>
          </div>
        )}

        <div className="flex gap-3 pt-6">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
            {t('cancel')}
          </button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors">
            {loading ? t('saving') : object ? t('save') : t('create')}
          </button>
        </div>
      </form>
    </SidePanel>
  );
}
