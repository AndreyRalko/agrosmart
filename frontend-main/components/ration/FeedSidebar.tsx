'use client';

import { useEffect, useState, FormEvent } from 'react';
import { createFeed, deleteFeed, updateFeed } from '@/lib/api/ration/ration';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { rationErrorMessage } from '@/lib/utils/ration';
import { FEED_NUTRIENT_FIELDS, type Feed, type FeedNutrientField, type FeedWrite } from '@/lib/types/ration/ration';
import SidePanel from '@/components/ui/SidePanel';
import { ErrorBox, FieldError, inputClass, inputErrorClass } from '@/components/ui/form';

/** Показатели корма: проценты от натуральной массы, энергия — МДж/кг (как в Ration.get_nutrition()). */
export const FEED_FIELD_META: Record<FeedNutrientField, { label: string; short: string; unit: string }> = {
  dry_matter: { label: 'Сухое вещество', short: 'СВ', unit: '%' },
  energy: { label: 'Обменная энергия', short: 'ОЭ', unit: 'МДж/кг' },
  protein: { label: 'Сырой протеин', short: 'Протеин', unit: '%' },
  fiber: { label: 'Клетчатка', short: 'Клетч.', unit: '%' },
  fat: { label: 'Жир', short: 'Жир', unit: '%' },
  ndf: { label: 'NDF', short: 'NDF', unit: '%' },
  starch: { label: 'Крахмал', short: 'Крахмал', unit: '%' },
  calcium: { label: 'Кальций', short: 'Ca', unit: '%' },
  phosphorus: { label: 'Фосфор', short: 'P', unit: '%' },
};

/** Decimal(6,3) на бэке: не больше 999.999. */
const MAX_NUTRIENT = 999.999;

type FormState = { name: string; price_per_kg: string } & Record<FeedNutrientField, string>;

const FIELDS = ['name', 'price_per_kg', ...FEED_NUTRIENT_FIELDS];

function initialForm(feed: Feed | null): FormState {
  const base = Object.fromEntries(FEED_NUTRIENT_FIELDS.map(k => [k, feed ? feed[k] : '0'])) as Record<FeedNutrientField, string>;
  return { name: feed?.name ?? '', price_per_kg: feed?.price_per_kg ?? '0', ...base };
}

interface FeedSidebarProps {
  isOpen: boolean;
  feed: Feed | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function FeedSidebar({ isOpen, feed, onClose, onSaved }: FeedSidebarProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(initialForm(null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setForm(initialForm(feed));
    setError('');
    setFieldErrors({});
  }, [isOpen, feed]);

  const set = (key: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Обязательное поле';
    for (const k of FEED_NUTRIENT_FIELDS) {
      const v = Number(form[k]);
      if (form[k] === '' || !Number.isFinite(v) || v < 0) errs[k] = 'Число не меньше 0';
      else if (FEED_FIELD_META[k].unit === '%' && v > 100) errs[k] = 'Не больше 100 %';
      else if (v > MAX_NUTRIENT) errs[k] = `Не больше ${MAX_NUTRIENT}`;
    }
    const price = Number(form.price_per_kg);
    if (form.price_per_kg === '' || !Number.isFinite(price) || price < 0) errs.price_per_kg = 'Число не меньше 0';
    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    const payload: FeedWrite = { ...form, name: form.name.trim() };
    setSaving(true);
    setError('');
    try {
      if (feed) await updateFeed(feed.id, payload);
      else await createFeed(payload);
      onSaved();
      onClose();
    } catch (err) {
      const parsed = rationErrorMessage(err, 'Не удалось сохранить корм', FIELDS);
      setFieldErrors(parsed.fields);
      setError(parsed.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!feed || !confirm(`Удалить корм «${feed.name}» из справочника?`)) return;
    setSaving(true);
    setError('');
    try {
      await deleteFeed(feed.id);
      onSaved();
      onClose();
    } catch (err) {
      setError(rationErrorMessage(err, 'Не удалось удалить корм').message);
    } finally {
      setSaving(false);
    }
  };

  const cls = (key: string) => (fieldErrors[key] ? inputErrorClass : inputClass);

  return (
    <SidePanel isOpen={isOpen} title={feed ? 'Редактировать корм' : 'Новый корм'} onClose={onClose}>
      <ErrorBox message={error} />
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Название {t('requiredField')}</label>
          <input type="text" maxLength={255} value={form.name} onChange={e => set('name', e.target.value)} className={cls('name')} />
          <FieldError message={fieldErrors.name} />
        </div>

        <p className="text-xs text-neutral-500">Показатели — на натуральную массу корма: проценты, энергия — МДж на 1 кг.</p>
        <div className="grid grid-cols-2 gap-3">
          {FEED_NUTRIENT_FIELDS.map(k => (
            <div key={k}>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">{FEED_FIELD_META[k].label}, {FEED_FIELD_META[k].unit}</label>
              <input type="number" min="0" step="0.001" value={form[k]} onChange={e => set(k, e.target.value)} className={cls(k)} />
              <FieldError message={fieldErrors[k]} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">Цена, ₸/кг</label>
            <input type="number" min="0" step="0.01" value={form.price_per_kg} onChange={e => set('price_per_kg', e.target.value)} className={cls('price_per_kg')} />
            <FieldError message={fieldErrors.price_per_kg} />
          </div>
        </div>

        {feed && (
          <div className="pt-4 border-t border-neutral-200">
            <button type="button" onClick={handleDelete} disabled={saving}
              className="w-full px-4 py-2.5 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors disabled:bg-neutral-100 disabled:text-neutral-400">
              {t('delete')} корм
            </button>
          </div>
        )}

        <div className="flex gap-3 pt-6">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
            {t('cancel')}
          </button>
          <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors">
            {saving ? t('saving') : feed ? t('save') : t('create')}
          </button>
        </div>
      </form>
    </SidePanel>
  );
}
