'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import {
  addStorageChemistry, downloadChemistryTemplate, getStorageChemistry, importStorageChemistry,
  CHEMISTRY_FIELD_LABELS,
} from '@/lib/api/storage/storage';
import { parseDrfError } from '@/lib/utils/drf-errors';
import {
  CHEMISTRY_NUMERIC_FIELDS,
  type ChemistryImportResult, type ChemistryNumericField, type FeedChemistry, type FeedChemistryCreate,
} from '@/lib/types/storage/storage';
import {
  ErrorBox, FieldError, formatDateTime, formatNumber, inputClass, inputErrorClass,
  primaryButtonClass, secondaryButtonClass, tdClass, thClass,
} from '@/components/ui/form';

const FIELDS = ['sample_name', 'notes', ...CHEMISTRY_NUMERIC_FIELDS];

type FormState = { sample_name: string; notes: string } & Record<ChemistryNumericField, string>;

const emptyForm = (): FormState => ({
  sample_name: '',
  notes: '',
  ...Object.fromEntries(CHEMISTRY_NUMERIC_FIELDS.map(k => [k, ''])) as Record<ChemistryNumericField, string>,
});

// Бэк отвечает на ошибки импорта в форме {"error": "..."} по-английски.
function importErrorMessage(err: unknown): string {
  const msg = parseDrfError(err, [], 'Не удалось импортировать файл').message;
  if (msg.includes('No file uploaded')) return 'Файл не был передан';
  if (msg.includes('Could not read')) return 'Не удалось прочитать файл — ожидается .xlsx';
  if (msg.includes('No valid rows')) return 'В файле нет ни одной заполненной строки';
  if (msg === 'Not found') return 'Объект хранения не найден';
  return msg;
}

function fieldLabel(key: string): string {
  if (key === 'sample_name') return 'Проба';
  return (CHEMISTRY_FIELD_LABELS as Record<string, { label: string }>)[key]?.label ?? key;
}

export default function ChemistryTab({ storageId }: { storageId: number }) {
  const [items, setItems] = useState<FeedChemistry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ChemistryImportResult | null>(null);
  const [importError, setImportError] = useState('');
  const [templateLoading, setTemplateLoading] = useState(false);

  const load = async () => {
    setError('');
    try {
      setItems(await getStorageChemistry(storageId));
    } catch (err) {
      setError(parseDrfError(err, [], 'Не удалось загрузить анализы').message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [storageId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const filled = CHEMISTRY_NUMERIC_FIELDS.filter(k => form[k] !== '');
    if (!form.sample_name.trim() && filled.length === 0) {
      setFormError('Заполните название пробы или хотя бы один показатель');
      return;
    }

    const payload: FeedChemistryCreate = { sample_name: form.sample_name.trim(), notes: form.notes };
    for (const k of CHEMISTRY_NUMERIC_FIELDS) {
      payload[k] = form[k] === '' ? null : form[k];
    }

    setSaving(true);
    setFormError('');
    setFieldErrors({});
    try {
      await addStorageChemistry(storageId, payload);
      setForm(emptyForm());
      setFormOpen(false);
      await load();
    } catch (err) {
      const parsed = parseDrfError(err, FIELDS, 'Не удалось сохранить анализ');
      setFieldErrors(parsed.fields);
      setFormError(parsed.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTemplate = async () => {
    setTemplateLoading(true);
    setImportError('');
    try {
      await downloadChemistryTemplate();
    } catch (err) {
      setImportError(parseDrfError(err, [], 'Не удалось скачать шаблон').message);
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportError('');
    setImportResult(null);
    try {
      const result = await importStorageChemistry(storageId, file);
      setImportResult(result);
      await load();
    } catch (err) {
      setImportError(importErrorMessage(err));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (loading) return <p className="text-sm text-neutral-500">Загрузка...</p>;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-neutral-200 p-4">
        <div className="flex flex-wrap gap-2">
          {!formOpen && (
            <button onClick={() => { setFormOpen(true); setFormError(''); setFieldErrors({}); }} className={primaryButtonClass}>
              Добавить анализ
            </button>
          )}
          <button onClick={handleTemplate} disabled={templateLoading} className={secondaryButtonClass}>
            {templateLoading ? 'Скачивание...' : 'Скачать шаблон'}
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={importing} className={secondaryButtonClass}>
            {importing ? 'Импорт...' : 'Импорт из xlsx'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); }}
          />
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          Импортируется первый лист, данные — со второй строки. Вторая строка шаблона («Проба №1») — пример:
          удалите её перед загрузкой, иначе она попадёт в базу.
        </p>

        <div className="mt-3"><ErrorBox message={importError} /></div>

        {importResult && (
          <div className={`mt-3 p-3 text-sm border-l-4 ${importResult.errors.length ? 'bg-amber-50 border-amber-500 text-amber-900' : 'bg-green-50 border-green-600 text-green-900'}`}>
            <p className="font-medium">Импортировано записей: {importResult.imported}</p>
            {importResult.errors.length > 0 && (
              <>
                <p className="mt-1">
                  Не распознано ячеек: {importResult.errors.length}. Строки сохранены, в этих ячейках записано пустое значение.
                </p>
                <ul className="mt-2 space-y-0.5 text-xs max-h-40 overflow-y-auto">
                  {importResult.errors.map((e, i) => (
                    <li key={i}>
                      Строка {e.row}, «{fieldLabel(e.field)}»: «{String(e.value)}» — {e.error === 'Invalid number' ? 'не число' : e.error}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 p-4" noValidate>
          <p className="text-sm font-medium text-neutral-900 mb-3">Новый анализ</p>
          <ErrorBox message={formError} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Проба</label>
              <input type="text" maxLength={255} value={form.sample_name}
                onChange={e => setForm({ ...form, sample_name: e.target.value })}
                className={fieldErrors.sample_name ? inputErrorClass : inputClass} />
              <FieldError message={fieldErrors.sample_name} />
            </div>
            {CHEMISTRY_NUMERIC_FIELDS.map(k => (
              <div key={k}>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  {CHEMISTRY_FIELD_LABELS[k].label}, {CHEMISTRY_FIELD_LABELS[k].unit}
                </label>
                <input type="number" step="0.01" min="0" value={form[k]}
                  onChange={e => setForm({ ...form, [k]: e.target.value })}
                  className={fieldErrors[k] ? inputErrorClass : inputClass} />
                <FieldError message={fieldErrors[k]} />
              </div>
            ))}
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Примечания</label>
              <textarea rows={2} value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className={fieldErrors.notes ? inputErrorClass : inputClass} />
              <FieldError message={fieldErrors.notes} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={saving} className={primaryButtonClass}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button type="button" onClick={() => setFormOpen(false)} className={secondaryButtonClass}>Отмена</button>
          </div>
        </form>
      )}

      {error ? (
        <div className="bg-white border border-neutral-200 p-4">
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button onClick={() => { setLoading(true); load(); }} className={secondaryButtonClass}>Повторить</button>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-neutral-200 p-8 text-center text-sm text-neutral-500">Анализов пока нет</div>
      ) : (
        <div className="bg-white border border-neutral-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className={thClass}>Дата</th>
                <th className={thClass}>Проба</th>
                {CHEMISTRY_NUMERIC_FIELDS.map(k => (
                  <th key={k} className={`${thClass} whitespace-nowrap`}>
                    {CHEMISTRY_FIELD_LABELS[k].label}, {CHEMISTRY_FIELD_LABELS[k].unit}
                  </th>
                ))}
                <th className={thClass}>Примечания</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {items.map(c => (
                <tr key={c.id} className="hover:bg-neutral-50">
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDateTime(c.created_at)}</td>
                  <td className={tdClass}>{c.sample_name || <span className="text-neutral-400">—</span>}</td>
                  {CHEMISTRY_NUMERIC_FIELDS.map(k => (
                    <td key={k} className={tdClass}>{formatNumber(c[k])}</td>
                  ))}
                  <td className={`${tdClass} text-xs text-neutral-600 max-w-xs`}>{c.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
