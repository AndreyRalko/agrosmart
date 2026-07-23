'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { getAgroField, updateAgroField, deleteAgroField } from '@/lib/api/agro-operations/field';
import { getAgroOperations } from '@/lib/api/agro-operations/operation';
import { getIntegrations } from '@/lib/api/integration/integration';
import { getLanguage } from '@/lib/api/client';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { AgroField, AgroFieldUpdate } from '@/lib/types/agro-operations/field';
import type { AgroOperation } from '@/lib/types/agro-operations/operation';
import type { Integration } from '@/lib/types/integration/integration';
import { formatIntegrationFieldLabel } from '@/lib/constants/integration-metrics';

interface EditFieldModalProps {
  isOpen: boolean;
  field: AgroField | null;
  onClose: () => void;
  onSuccess: () => void;
}

type FieldDataSource = 'sensor' | 'manual';

export default function EditFieldModal({ isOpen, field, onClose, onSuccess }: EditFieldModalProps) {
  const { t } = useTranslation();
  const [operations, setOperations] = useState<AgroOperation[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [dataSource, setDataSource] = useState<FieldDataSource>('sensor');
  const [formData, setFormData] = useState<AgroFieldUpdate>({
    operation: 0,
    integration: null,
    integration_field: null,
    type: 0,
    required: false,
    name_ru: '',
    name_kk: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState('');

  // Combobox для операций
  const [operationSearch, setOperationSearch] = useState('');
  const [isOperationDropdownOpen, setIsOperationDropdownOpen] = useState(false);
  const operationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (field && isOpen) {
      loadDataAndDetails();
    }
  }, [field?.id, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (operationRef.current && !operationRef.current.contains(event.target as Node)) {
        setIsOperationDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadDataAndDetails = async () => {
    try {
      const [operationsData, integrationsData] = await Promise.all([
        getAgroOperations(),
        getIntegrations(),
      ]);
      setOperations(operationsData.results || []);
      setIntegrations(integrationsData.results || []);
      
      await loadFieldDetails(operationsData.results || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const loadFieldDetails = async (ops: AgroOperation[]) => {
    if (!field) return;
    
    setLoadingDetails(true);
    setError('');
    
    try {
      const details = await getAgroField(field.id);
      
      setFormData({
        operation: details.operation,
        integration: details.integration?.id ?? null,
        integration_field: details.integration_field?.id ?? null,
        type: details.type,
        required: details.required,
        name_ru: details.name_ru,
        name_kk: details.name_kk,
      });
      setDataSource(details.integration ? 'sensor' : 'manual');

      const selectedOp = ops.find(op => op.id === details.operation);
      if (selectedOp) {
        setOperationSearch(selectedOp.name);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load field details';
      setError(message);
      
      if (field) {
        setFormData({
          operation: field.operation,
          integration: field.integration?.id ?? null,
          integration_field: field.integration_field?.id ?? null,
          type: field.type,
          required: field.required,
          name_ru: field.name_ru,
          name_kk: field.name_kk,
        });
        setDataSource(field.integration ? 'sensor' : 'manual');

        const selectedOp = ops.find(op => op.id === field.operation);
        if (selectedOp) {
          setOperationSearch(selectedOp.name);
        }
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'integration') {
      const integrationId = parseInt(value, 10);
      setFormData(prev => ({
        ...prev,
        integration: integrationId || null,
        integration_field: null,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'operation' || name === 'integration_field' || name === 'type'
          ? parseInt(value, 10)
          : value
      }));
    }
    
    if (error) setError('');
  };

  const handleOperationSelect = (operation: AgroOperation) => {
    setFormData(prev => ({ ...prev, operation: operation.id }));
    setOperationSearch(operation.name);
    setIsOperationDropdownOpen(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!field) return;

    setLoading(true);
    setError('');

    try {
      if (dataSource === 'sensor' && (!formData.integration || !formData.integration_field)) {
        setError('Выберите интеграцию и показатель для сравнения');
        setLoading(false);
        return;
      }

      const currentLang = getLanguage();
      
      const updateData: Partial<AgroFieldUpdate> = {
        operation: formData.operation,
        integration: dataSource === 'manual' ? null : formData.integration ?? null,
        integration_field: dataSource === 'manual' ? null : formData.integration_field ?? null,
        type: formData.type,
        required: formData.required,
      };
      
      if (currentLang === 'kk') {
        updateData.name_kk = formData.name_kk;
      } else {
        updateData.name_ru = formData.name_ru;
      }

      await updateAgroField(field.id, updateData as AgroFieldUpdate);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update field';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!field || !confirm('Вы уверены что хотите удалить это поле?')) return;

    setLoading(true);
    setError('');

    try {
      await deleteAgroField(field.id);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete field';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !field) return null;

  const filteredOperations = operations.filter(op =>
    op.name.toLowerCase().includes(operationSearch.toLowerCase())
  );

  const selectedOperation = operations.find(op => op.id === formData.operation);
  const selectedIntegration = integrations.find(int => int.id === formData.integration);
  const integrationFields = selectedIntegration?.fields ?? [];
  const usesSensor = dataSource === 'sensor';

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    >
      <div 
        className="bg-white w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-neutral-900">Редактировать поле</h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-900 transition-colors"
            aria-label={t('close')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-600 text-red-800 text-sm">
            {error}
          </div>
        )}

        {loadingDetails ? (
          <div className="py-8 text-center">
            <div className="inline-block animate-spin h-8 w-8 border-b-2 border-neutral-900"></div>
            <p className="mt-2 text-sm text-neutral-500">Загрузка...</p>
          </div>
        ) : (
          <>
            <div className="mb-4 p-3 bg-neutral-50 border border-neutral-200 text-sm">
              <div className="font-medium text-neutral-900 mb-1">Текущее название:</div>
              <div className="text-neutral-700">{field.name}</div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Операция - Combobox */}
              <div ref={operationRef}>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Операция
                </label>
                
                <div className="relative">
                  <input
                    type="text"
                    value={operationSearch}
                    onChange={(e) => {
                      setOperationSearch(e.target.value);
                      setIsOperationDropdownOpen(true);
                    }}
                    onFocus={() => setIsOperationDropdownOpen(true)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                  />
                  
                  {isOperationDropdownOpen && filteredOperations.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-300 max-h-60 overflow-y-auto z-10">
                      {filteredOperations.map(operation => (
                        <div
                          key={operation.id}
                          onClick={() => handleOperationSelect(operation)}
                          className={`px-3 py-2 text-sm cursor-pointer text-neutral-900 hover:bg-neutral-100 ${
                            formData.operation === operation.id ? 'bg-neutral-100 font-medium' : ''
                          }`}
                        >
                          {operation.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {selectedOperation && (
                  <div className="mt-1 text-xs text-neutral-500">
                    Выбрано: {selectedOperation.name}
                  </div>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Тип
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                >
                  <option value={0}>Условия старта</option>
                  <option value={1}>Индикаторы выполнения</option>
                </select>
              </div>

              {/* Required */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="required"
                  id="required"
                  checked={formData.required}
                  onChange={handleChange}
                  className="w-4 h-4 text-green-600 border-neutral-300 focus:ring-green-500"
                />
                <label htmlFor="required" className="text-sm font-medium text-neutral-700">
                  Обязательное поле
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Источник показателя
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDataSource('sensor')}
                    className={`flex-1 px-3 py-2 text-sm border transition-colors ${
                      usesSensor
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    Датчик (интеграция)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDataSource('manual');
                      setFormData(prev => ({ ...prev, integration: null, integration_field: null }));
                    }}
                    className={`flex-1 px-3 py-2 text-sm border transition-colors ${
                      !usesSensor
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    Ручной ввод
                  </button>
                </div>
                {!usesSensor && (
                  <p className="mt-1 text-xs text-neutral-500">
                    Значение вводится вручную при выполнении задачи, без привязки к API.
                  </p>
                )}
              </div>

              {usesSensor && (
                <>
              {/* Интеграция */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Интеграция
                </label>
                <select
                  name="integration"
                  value={formData.integration ?? 0}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                >
                  <option value={0}>Выберите интеграцию</option>
                  {integrations.map(integration => (
                    <option key={integration.id} value={integration.id}>
                      {integration.name}
                    </option>
                  ))}
                </select>
              </div>

              {Boolean(formData.integration) && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Поле интеграции для сравнения
                  </label>
                  <select
                    name="integration_field"
                    value={formData.integration_field || 0}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                  >
                    <option value={0}>Выберите метрику</option>
                    {integrationFields.map(intField => (
                      <option key={intField.id} value={intField.id}>
                        {formatIntegrationFieldLabel(intField)}
                      </option>
                    ))}
                  </select>
                  {integrationFields.length === 0 && (
                    <p className="mt-1 text-xs text-amber-700">
                      У выбранной интеграции нет настроенных полей.
                    </p>
                  )}
                </div>
              )}
                </>
              )}

              {/* Название */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Название
                </label>
                <input
                  type="text"
                  name={getLanguage() === 'kk' ? 'name_kk' : 'name_ru'}
                  value={getLanguage() === 'kk' ? (formData.name_kk || '') : (formData.name_ru || '')}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                  placeholder="Введите название"
                />
              </div>

              <div className="pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="w-full px-4 py-2.5 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors disabled:bg-neutral-100 disabled:text-neutral-400"
                >
                  {t('delete')} поле
                </button>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors"
                >
                  {loading ? t('saving') : t('save')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}