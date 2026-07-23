'use client';

import { useState, FormEvent, useEffect } from 'react';
import { getVariety, updateVariety, deleteVariety } from '@/lib/api/culture-operations/variety';
import { getCultures } from '@/lib/api/culture-operations/culture';
import { getAgroOperations } from '@/lib/api/agro-operations/operation';
import { getByCultureVariety, setConditions } from '@/lib/api/agro-operations/custom';
import { getLanguage } from '@/lib/api/client';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { Variety, VarietyUpdate } from '@/lib/types/culture-operations/variety';
import type { Culture } from '@/lib/types/culture-operations/culture';
import type { AgroOperation } from '@/lib/types/agro-operations/operation';
import type { FieldCondition } from '@/lib/api/agro-operations/custom';
import type { ConditionOperator } from '@/lib/types/agro-operations/condition';
import { formatIntegrationFieldLabel, formatMetricValueWithUnit, getMetricInputHint, isFractionMetric } from '@/lib/constants/integration-metrics';
import EditCultureModal from '@/components/culture/EditCultureModal';

interface EditVarietyModalProps {
  isOpen: boolean;
  variety: Variety | null;
  cultures?: Culture[];
  onClose: () => void;
  onSuccess: () => void;
}

type NpkKey = 'N' | 'P2O5' | 'K2O';

const OPERATORS: { op: ConditionOperator; label: string; disabledIf: ConditionOperator[] }[] = [
  { op: 'eq',  label: 'Равно (=)',         disabledIf: ['ne', 'gt', 'gte', 'lt', 'lte'] },
  { op: 'ne',  label: 'Не равно (≠)',      disabledIf: ['eq', 'gt', 'gte', 'lt', 'lte'] },
  { op: 'gt',  label: 'Больше (>)',        disabledIf: ['eq', 'ne', 'gte'] },
  { op: 'gte', label: 'Больше/равно (≥)',  disabledIf: ['eq', 'ne', 'gt'] },
  { op: 'lt',  label: 'Меньше (<)',        disabledIf: ['eq', 'ne', 'lte'] },
  { op: 'lte', label: 'Меньше/равно (≤)', disabledIf: ['eq', 'ne', 'lt'] },
];

export default function EditVarietyModal({ isOpen, variety, cultures: propCultures, onClose, onSuccess }: EditVarietyModalProps) {
  const { t } = useTranslation();
  const [cultures, setCultures] = useState<Culture[]>(propCultures || []);
  const [allOperations, setAllOperations] = useState<AgroOperation[]>([]);
  const [varietyOperations, setVarietyOperations] = useState<number[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<AgroOperation | null>(null);
  const [isAddingOperation, setIsAddingOperation] = useState(false);
  const [operationSearch, setOperationSearch] = useState('');
  const [isOperationDropdownOpen, setIsOperationDropdownOpen] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<number, FieldCondition>>({});
  const [formData, setFormData] = useState<VarietyUpdate>({ culture: 0, name_ru: '', name_kk: '' });
  const [npk, setNpk] = useState<Record<NpkKey, string>>({ N: '', P2O5: '', K2O: '' });
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState('');
  const [isEditCultureOpen, setIsEditCultureOpen] = useState(false);

  useEffect(() => {
    if (variety && isOpen) {
      loadData();
      loadVarietyDetails();
      loadVarietyOperations();
    }
  }, [variety?.id, isOpen]);

  useEffect(() => {
    if (propCultures && propCultures.length > 0) setCultures(propCultures);
  }, [propCultures]);

  const loadData = async () => {
    try {
      const [culturesData, operationsData] = await Promise.all([getCultures(), getAgroOperations()]);
      setCultures(culturesData.results || []);
      setAllOperations(operationsData.results || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const loadVarietyOperations = async () => {
    if (!variety) return;
    try {
      const data = await getByCultureVariety(variety.id);
      setVarietyOperations(data.results.map(op => op.id));
    } catch (err) {
      console.error('Failed to load variety operations:', err);
    }
  };

  const loadVarietyDetails = async () => {
    if (!variety) return;
    setLoadingDetails(true);
    setError('');
    try {
      const details = await getVariety(variety.id);
      const varietyCulture = cultures.find(c => c.varieties.some(v => v.id === variety.id));
      setFormData({ culture: varietyCulture?.id || 0, name_ru: details.name_ru, name_kk: details.name_kk });
      const npkData = details.options?.['npk-removal'];
      if (npkData) {
        setNpk({ N: String(npkData.N), P2O5: String(npkData.P2O5), K2O: String(npkData.K2O) });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load variety details';
      setError(message);
      if (variety) {
        const varietyCulture = cultures.find(c => c.varieties.some(v => v.id === variety.id));
        setFormData({ culture: varietyCulture?.id || 0, name_ru: variety.name_ru, name_kk: variety.name_kk });
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'culture' ? parseInt(value, 10) : value }));
    if (error) setError('');
  };

  const handleNpkChange = (key: NpkKey, value: string) => {
    setNpk(prev => ({ ...prev, [key]: value }));
  };

  const handleOperationSelect = async (operation: AgroOperation) => {
    setSelectedOperation(operation);
    const initialValues: Record<number, FieldCondition> = {};
    try {
      const data = await getByCultureVariety(variety!.id);
      const operationData = data.results.find(op => op.id === operation.id);
      if (operationData) {
        operation.fields.forEach(field => {
          const fieldData = operationData.fields.find(f => f.id === field.id);
          const metricKey = fieldData?.integration_field?.field_name ?? field.integration_field?.field_name;
          if (fieldData && fieldData.conditions && fieldData.conditions.length > 0) {
            const rawValues = fieldData.conditions[0].values;
            const values = Object.fromEntries(
              Object.entries(rawValues).map(([op, val]) => {
                const num = Number(val);
                if (isFractionMetric(metricKey) && num > 1) {
                  return [op, num / 100];
                }
                return [op, val];
              }),
            );
            initialValues[field.id] = { field: field.id, values };
          } else {
            initialValues[field.id] = { field: field.id, values: {} };
          }
        });
      } else {
        operation.fields.forEach(field => { initialValues[field.id] = { field: field.id, values: {} }; });
      }
    } catch {
      operation.fields.forEach(field => { initialValues[field.id] = { field: field.id, values: {} }; });
    }
    setFieldValues(initialValues);
  };

  const handleFieldValueChange = (fieldId: number, operator: ConditionOperator, value: string) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldId]: {
        field: fieldId,
        values: { ...prev[fieldId]?.values, [operator]: value ? parseFloat(value) : undefined },
      },
    }));
  };

  const handleSaveConditions = async () => {
    if (!variety || !selectedOperation) return;
    setLoading(true);
    setError('');
    try {
      const conditions = Object.values(fieldValues).filter(fc => Object.keys(fc.values).length > 0);
      await setConditions({ culture_variety: variety.id, operation: selectedOperation.id, conditions });
      await loadVarietyOperations();
      setSelectedOperation(null);
      setFieldValues({});
      alert('Условия сохранены!');
    } catch (err) {
        if (err instanceof Error) {
          try {
            const parsed = JSON.parse(err.message);
            const msg = parsed?.detail?.conditions?.msg || JSON.stringify(parsed);
            setError(msg);
          } catch {
            setError(err.message);
          }
        } else {
          setError('Ошибка сохранения условий');
        }
      } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!variety) return;
    setLoading(true);
    setError('');
    try {
      const currentLang = getLanguage();
      const updateData: VarietyUpdate = {
        culture: formData.culture,
        options: {
          'npk-removal': {
            N: parseFloat(npk.N) || 0,
            P2O5: parseFloat(npk.P2O5) || 0,
            K2O: parseFloat(npk.K2O) || 0,
          },
        },
      };
      if (currentLang === 'kk') {
        updateData.name_kk = formData.name_kk;
      } else {
        updateData.name_ru = formData.name_ru;
      }
      await updateVariety(variety.id, updateData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update variety');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!variety || !confirm('Вы уверены что хотите удалить этот сорт?')) return;
    setLoading(true);
    setError('');
    try {
      await deleteVariety(variety.id);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete variety');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !variety) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">Редактировать сорт</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-600 text-red-800 text-sm">{error}</div>}

        {loadingDetails ? (
          <div className="py-8 text-center">
            <div className="inline-block animate-spin h-8 w-8 border-b-2 border-neutral-900" />
            <p className="mt-2 text-sm text-neutral-500">Загрузка...</p>
          </div>
        ) : (
          <>
            <div className="mb-4 p-3 bg-neutral-50 border border-neutral-200 text-sm">
              <div className="font-medium text-neutral-900 mb-1">Сорт:</div>
              <div className="text-neutral-700">{variety.name}</div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Культура */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Культура</label>
                <div className="flex gap-2">
                  <select name="culture" value={formData.culture} onChange={handleChange}
                    className="flex-1 px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors">
                    <option value={0}>Выберите культуру</option>
                    {cultures.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setIsEditCultureOpen(true)} disabled={!formData.culture}
                    className="px-3 py-2 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:bg-neutral-100 disabled:text-neutral-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Название */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Название</label>
                <input
                  type="text"
                  name={getLanguage() === 'kk' ? 'name_kk' : 'name_ru'}
                  value={getLanguage() === 'kk' ? (formData.name_kk || '') : (formData.name_ru || '')}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                  placeholder="Введите название"
                />
              </div>

              {/* NPK */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Вынос NPK (кг/т урожая)</label>
                <p className="text-xs text-neutral-600 mb-2">Количество питательных веществ, выносимых с урожаем</p>
                <div className="grid grid-cols-3 gap-3">
                  {(['N', 'P2O5', 'K2O'] as NpkKey[]).map(key => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-neutral-500 mb-1">{key}</label>
                      <input type="number" step="0.01" min="0" value={npk[key]}
                        onChange={e => handleNpkChange(key, e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                        placeholder="0.00" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Операции */}
              <div className="border-t border-neutral-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-neutral-700">Операции сорта</label>
                  <button type="button" onClick={() => setIsAddingOperation(true)}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium hover:bg-green-700">
                    + Добавить операцию
                  </button>
                </div>

                {!selectedOperation && !isAddingOperation ? (
                  <div className="space-y-2">
                    {allOperations.filter(op => varietyOperations.includes(op.id)).map(operation => (
                      <button key={operation.id} type="button" onClick={() => handleOperationSelect(operation)}
                        className="w-full p-3 border border-neutral-300 text-left hover:bg-neutral-50 transition-colors">
                        <div className="font-medium text-neutral-900">{operation.name}</div>
                        <div className="text-sm text-neutral-600">{operation.fields.length} полей</div>
                      </button>
                    ))}
                    {varietyOperations.length === 0 && (
                      <div className="text-sm text-neutral-500 italic p-4 text-center bg-neutral-50">
                        Нет привязанных операций. Нажмите &quot;+ Добавить операцию&quot;
                      </div>
                    )}
                  </div>
                ) : isAddingOperation ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-medium text-neutral-900">Добавить операцию</div>
                      <button type="button" onClick={() => { setIsAddingOperation(false); setOperationSearch(''); setIsOperationDropdownOpen(false); }}
                        className="text-sm text-neutral-600 hover:text-neutral-900">Отмена</button>
                    </div>
                    <div className="relative">
                      <input type="text" value={operationSearch}
                        onChange={e => { setOperationSearch(e.target.value); setIsOperationDropdownOpen(true); }}
                        onFocus={() => setIsOperationDropdownOpen(true)}
                        placeholder="Поиск операции..."
                        className="w-full px-3 py-2 border border-neutral-300 text-sm focus:outline-none focus:border-neutral-900" />
                      {isOperationDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-300 max-h-60 overflow-y-auto z-10 shadow-lg">
                          {allOperations
                            .filter(op => !varietyOperations.includes(op.id) && op.name.toLowerCase().includes(operationSearch.toLowerCase()))
                            .map(operation => (
                              <div key={operation.id}
                                onClick={() => { handleOperationSelect(operation); setIsAddingOperation(false); setOperationSearch(''); setIsOperationDropdownOpen(false); }}
                                className="px-3 py-2 text-sm cursor-pointer hover:bg-green-50 border-b border-neutral-100">
                                <div className="font-medium text-neutral-900">{operation.name}</div>
                                <div className="text-xs text-neutral-600">{operation.fields.length} полей</div>
                              </div>
                            ))}
                          {allOperations.filter(op => !varietyOperations.includes(op.id) && op.name.toLowerCase().includes(operationSearch.toLowerCase())).length === 0 && (
                            <div className="px-3 py-4 text-sm text-neutral-500 text-center">
                              {operationSearch ? 'Операции не найдены' : 'Все операции уже добавлены'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : selectedOperation ? (
                  <div className="border border-neutral-300 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-medium text-neutral-900">{selectedOperation.name}</div>
                      <button type="button" onClick={() => { setSelectedOperation(null); setFieldValues({}); }}
                        className="text-sm text-neutral-600 hover:text-neutral-900">Назад</button>
                    </div>
                    <div className="space-y-4">
                      {selectedOperation.fields.map(field => {
                        const metricKey = field.integration_field?.field_name;
                        return (
                        <div key={field.id} className="border border-neutral-200 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-neutral-900">{field.name}</div>
                            {field.required && <span className="text-xs text-red-600">Обязательно</span>}
                          </div>
                          <div className="text-xs text-neutral-500 mb-2">
                            {field.type === 0 ? 'Условия старта' : 'Индикаторы выполнения'}
                            {!field.integration && (
                              <span className="ml-2">• ручной ввод</span>
                            )}
                            {field.integration_field && (
                              <span className="ml-2">
                                • сравнение: {formatIntegrationFieldLabel(field.integration_field)}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {OPERATORS.map(({ op, label, disabledIf }) => (
                              <div key={op}>
                                <label className="text-xs text-neutral-600 mb-1 block">{label}</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder={metricKey && isFractionMetric(metricKey) ? '0.4' : '10.0'}
                                  value={fieldValues[field.id]?.values[op] ?? ''}
                                  onChange={e => handleFieldValueChange(field.id, op, e.target.value)}
                                  disabled={disabledIf.some(d => fieldValues[field.id]?.values[d] !== undefined)}
                                  className="w-full px-2 py-1 border border-neutral-300 text-sm text-neutral-900 bg-white disabled:bg-neutral-100 disabled:text-neutral-400 placeholder-neutral-500" />
                              </div>
                            ))}
                          </div>
                          {metricKey && getMetricInputHint(metricKey) && (
                            <p className="mt-2 text-xs text-neutral-500">
                              {getMetricInputHint(metricKey)}
                            </p>
                          )}
                        </div>
                        );
                      })}
                    </div>
                    <button type="button" onClick={handleSaveConditions} disabled={loading}
                      className="w-full mt-4 px-4 py-2 bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:bg-neutral-400">
                      {loading ? 'Сохранение...' : 'Сохранить условия'}
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Удалить */}
              <div className="pt-4 border-t border-neutral-200">
                <button type="button" onClick={handleDelete} disabled={loading}
                  className="w-full px-4 py-2.5 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors disabled:bg-neutral-100 disabled:text-neutral-600">
                  {t('delete')} сорт
                </button>
              </div>

              <div className="flex gap-3 pt-6">
                <button type="button" onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
                  {t('cancel')}
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors">
                  {loading ? t('saving') : t('save')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      <EditCultureModal
        isOpen={isEditCultureOpen}
        culture={cultures.find(c => c.id === formData.culture) || null}
        onClose={() => setIsEditCultureOpen(false)}
        onSuccess={() => { loadData(); setIsEditCultureOpen(false); }}
      />
    </div>
  );
}