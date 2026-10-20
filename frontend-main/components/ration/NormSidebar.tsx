'use client';

import { useEffect, useState, FormEvent } from 'react';
import { createNorm, updateNorm, RATION_TYPE_LABELS } from '@/lib/api/ration/ration';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { NUTRIENT_META, rationErrorMessage } from '@/lib/utils/ration';
import { NORM_FIELDS, type NormField, type NutritionNorm, type NutritionNormWrite, type RationType } from '@/lib/types/ration/ration';
import SidePanel from '@/components/ui/SidePanel';
import { ErrorBox, FieldError, inputClass, inputErrorClass } from '@/components/ui/form';

type Bounds = Record<`${NormField}_min` | `${NormField}_max`, string>;
type FormState = { ration_type: RationType } & Bounds;

/** Decimal(6,2) на бэке: не больше 9999.99. */
const MAX_BOUND = 9999.99;

function emptyBounds(norm: NutritionNorm | null): Bounds {
  const entries: [string, string][] = [];
  for (const k of NORM_FIELDS) {
    entries.push([`${k}_min`, norm?.[`${k}_min`] ?? '']);
    entries.push([`${k}_max`, norm?.[`${k}_max`] ?? '']);
  }
  return Object.fromEntries(entries) as Bounds;
}

interface NormSidebarProps {
  isOpen: boolean;
  /** null — создание. */
  norm: NutritionNorm | null;
  /** Тип рациона для новой нормы (выбран заранее на странице). */
  presetType: RationType | null;
  /** Типы, для которых нормы ещё нет (ration_type уникален). */
  freeTypes: RationType[];
  onClose: () => void;
  onSaved: () => void;
}

export default function NormSidebar({ isOpen, norm, presetType, freeTypes, onClose, onSaved }: NormSidebarProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>({ ration_type: 'dairy', ...emptyBounds(null) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      ration_type: norm?.ration_type ?? presetType ?? freeTypes[0] ?? 'dairy',
      ...emptyBounds(norm),
    });
    setError('');
    setFieldErrors({});
  }, [isOpen, norm, presetType, freeTypes]);

  const setBound = (key: keyof Bounds, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setFieldErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    for (const k of NORM_FIELDS) {
      const minRaw = form[`${k}_min`];
      const maxRaw = form[`${k}_max`];
      const min = Number(minRaw);
      const max = Number(maxRaw);
      if (minRaw !== '' && (!Number.isFinite(min) || min < 0 || min > MAX_BOUND)) errs[`${k}_min`] = `От 0 до ${MAX_BOUND}`;
      if (maxRaw !== '' && (!Number.isFinite(max) || max < 0 || max > MAX_BOUND)) errs[`${k}_max`] = `От 0 до ${MAX_BOUND}`;
      if (minRaw !== '' && maxRaw !== '' && !errs[`${k}_min`] && !errs[`${k}_max`] && min > max) {
        errs[`${k}_max`] = 'Максимум меньше минимума';
      }
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
    const payload: NutritionNormWrite = { ration_type: form.ration_type };
    for (const k of NORM_FIELDS) {
      payload[`${k}_min`] = form[`${k}_min`] === '' ? null : form[`${k}_min`];
      payload[`${k}_max`] = form[`${k}_max`] === '' ? null : form[`${k}_max`];
    }
    setSaving(true);
    setError('');
    try {
      if (norm) await updateNorm(norm.id, payload);
      else await createNorm(payload);
      onSaved();
      onClose();
    } catch (err) {
      const fields = ['ration_type', ...NORM_FIELDS.flatMap(k => [`${k}_min`, `${k}_max`])];
      const parsed = rationErrorMessage(err, 'Не удалось сохранить норму', fields);
      setFieldErrors(parsed.fields);
      setError(parsed.message);
    } finally {
      setSaving(false);
    }
  };

  const cls = (key: string) => (fieldErrors[key] ? inputErrorClass : inputClass);
  const typeOptions = norm ? [norm.ration_type] : freeTypes;

  return (
    <SidePanel isOpen={isOpen} title={norm ? 'Редактировать норму' : 'Новая норма'} onClose={onClose} width={460}>
      <ErrorBox message={error} />
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Тип рациона {t('requiredField')}</label>
          <select
            value={form.ration_type}
            disabled={!!norm}
            onChange={e => setForm(prev => ({ ...prev, ration_type: e.target.value as RationType }))}
            className={cls('ration_type')}
          >
            {typeOptions.map(k => <option key={k} value={k}>{RATION_TYPE_LABELS[k]}</option>)}
          </select>
          {norm && <p className="mt-1 text-xs text-neutral-500">Тип у существующей нормы не меняется: на каждый тип — одна норма.</p>}
          <FieldError message={fieldErrors.ration_type} />
        </div>

        <p className="text-xs text-neutral-500">
          Значения на 1 голову в сутки. Пустое поле — граница не задана. Для жира и крахмала норм нет.
        </p>

        <div className="space-y-3">
          {NORM_FIELDS.map(k => (
            <div key={k}>
              <p className="text-xs font-medium text-neutral-700 mb-1.5">{NUTRIENT_META[k].label}, {NUTRIENT_META[k].unit}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input type="number" min="0" step="0.01" placeholder="мин." value={form[`${k}_min`]}
                    onChange={e => setBound(`${k}_min`, e.target.value)} className={cls(`${k}_min`)} />
                  <FieldError message={fieldErrors[`${k}_min`]} />
                </div>
                <div>
                  <input type="number" min="0" step="0.01" placeholder="макс." value={form[`${k}_max`]}
                    onChange={e => setBound(`${k}_max`, e.target.value)} className={cls(`${k}_max`)} />
                  <FieldError message={fieldErrors[`${k}_max`]} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-6">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
            {t('cancel')}
          </button>
          <button type="submit" disabled={saving || (!norm && freeTypes.length === 0)} className="flex-1 px-4 py-2.5 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors">
            {saving ? t('saving') : norm ? t('save') : t('create')}
          </button>
        </div>
      </form>
    </SidePanel>
  );
}
