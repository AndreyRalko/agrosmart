'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { createAgroField } from '@/lib/api/agro-operations/field';
import { getAgroOperations } from '@/lib/api/agro-operations/operation';
import { getIntegrations } from '@/lib/api/integration/integration';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { AgroFieldCreate } from '@/lib/types/agro-operations/field';
import type { AgroOperation } from '@/lib/types/agro-operations/operation';
import type { Integration } from '@/lib/types/integration/integration';
import { formatIntegrationFieldLabel } from '@/lib/constants/integration-metrics';
import CreateOperationModal from './CreateOperationModal';

interface CreateFieldModalProps {
  isOpen: boolean;
  preselectedOperationId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

type FieldDataSource = 'sensor' | 'manual';

export default function CreateFieldModal({ isOpen, preselectedOperationId, onClose, onSuccess }: CreateFieldModalProps) {
  const { t } = useTranslation();
  const [operations, setOperations] = useState<AgroOperation[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [dataSource, setDataSource] = useState<FieldDataSource>('sensor');
  const [formData, setFormData] = useState<AgroFieldCreate>({
    operation: preselectedOperationId || 0,
    integration: null,
    integration_field: null,
    type: 0,
    required: false,
    name_ru: '',
    name_kk: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCreateOperationOpen, setIsCreateOperationOpen] = useState(false);
  
  // Combobox для операций
  const [operationSearch, setOperationSearch] = useState('');
  const [isOperationDropdownOpen, setIsOperationDropdownOpen] = useState(false);
  const operationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDataSource('sensor');
      loadData();
      // При открытии применяем preselectedOperationId
      if (preselectedOperationId) {
        setFormData(prev => ({ ...prev, operation: preselectedOperationId }));
      }
    }
  }, [isOpen, preselectedOperationId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (operationRef.current && !operationRef.current.contains(event.target as Node)) {
        setIsOperationDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      const [opsData, intData] = await Promise.all([
        getAgroOperations(),
        getIntegrations(),
      ]);
      const ops = opsData.results || [];
      setOperations(ops);
      setIntegrations(intData.results || []);
      
      // Если есть preselectedOperationId — выставляем название в поле поиска
      if (preselectedOperationId) {
        const preselected = ops.find(op => op.id === preselectedOperationId);
        if (preselected) {
          setOperationSearch(preselected.name);
          setFormData(prev => ({ ...prev, operation: preselectedOperationId }));
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err);
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

  const handleOperationCreated = async (operationId: number) => {
    await loadData();
    setFormData(prev => ({ ...prev, operation: operationId }));
    
    setTimeout(() => {
      const createdOp = operations.find(op => op.id === operationId);
      if (createdOp) {
        setOperationSearch(createdOp.name);
      }
    }, 100);
  };

  const handleOperationSelect = (operation: AgroOperation) => {
    setFormData(prev => ({ ...prev, operation: operation.id }));
    setOperationSearch(operation.name);
    setIsOperationDropdownOpen(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (dataSource === 'sensor' && (!formData.integration || !formData.integration_field)) {
        setError('Выберите интеграцию и показатель для сравнения');
        setLoading(false);
        return;
      }

      await createAgroField({
        ...formData,
        integration: dataSource === 'manual' ? null : formData.integration,
        integration_field: dataSource === 'manual' ? null : formData.integration_field || null,
      });
      onSuccess();
      onClose();
      
      setDataSource('sensor');
      setFormData({
        operation: preselectedOperationId || 0,
        integration: null,
        integration_field: null,
        type: 0,
        required: false,
        name_ru: '',
        name_kk: '',
      });
      setOperationSearch(preselectedOperationId 
        ? (operations.find(op => op.id === preselectedOperationId)?.name || '') 
        : ''
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create field';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const filteredOperations = operations.filter(op =>
    op.name.toLowerCase().includes(operationSearch.toLowerCase())
  );

  const selectedOperation = operations.find(op => op.id === formData.operation);
  const selectedIntegration = integrations.find(int => int.id === formData.integration);
  const integrationFields = selectedIntegration?.fields ?? [];
  const usesSensor = dataSource === 'sensor';
  const canSubmit =
    Boolean(formData.operation) &&
    (dataSource === 'manual' || (Boolean(formData.integration) && Boolean(formData.integration_field)));

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4"
      >
        <div 
          className="bg-white w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-neutral-900">Создать параметр</h2>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Операция - Combobox */}
            <div ref={operationRef}>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Операция {t('requiredField')}
              </label>
              
              <div className="flex gap-2">
                <div className="flex-1 relative">
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
                      {filteredOperations.map(op => (
                        <div
                          key={op.id}
                          onClick={() => handleOperationSelect(op)}
                          className={`px-3 py-2 text-sm cursor-pointer text-neutral-900 hover:bg-neutral-100 ${
                            formData.operation === op.id ? 'bg-neutral-100 font-medium' : ''
                          }`}
                        >
                          {op.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsCreateOperationOpen(true)}
                  className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Создать
                </button>
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
                Тип {t('requiredField')}
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
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
                Интеграция {t('requiredField')}
              </label>
              <select
                name="integration"
                value={formData.integration ?? 0}
                onChange={handleChange}
                required={usesSensor}
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              >
                <option value={0}>Выберите интеграцию</option>
                {integrations.map(int => (
                  <option key={int.id} value={int.id}>
                    {int.icon ? `${int.icon} ` : ''}{int.name}
                  </option>
                ))}
              </select>
            </div>

            {Boolean(formData.integration) && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Поле интеграции для сравнения {t('requiredField')}
                </label>
                <select
                  name="integration_field"
                  value={formData.integration_field || 0}
                  onChange={handleChange}
                  required={usesSensor}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                >
                  <option value={0}>Выберите метрику</option>
                  {integrationFields.map(field => (
                    <option key={field.id} value={field.id}>
                      {formatIntegrationFieldLabel(field)}
                    </option>
                  ))}
                </select>
                {integrationFields.length === 0 && (
                  <p className="mt-1 text-xs text-amber-700">
                    У выбранной интеграции нет настроенных полей. Добавьте их в разделе «Интеграции».
                  </p>
                )}
              </div>
            )}
              </>
            )}

            {/* Название RU */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Название (RU) {t('requiredField')}
              </label>
              <input
                type="text"
                name="name_ru"
                value={formData.name_ru}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                placeholder="Например: Поле датчиков"
              />
            </div>

            {/* Название KK */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Название (KK) {t('requiredField')}
              </label>
              <input
                type="text"
                name="name_kk"
                value={formData.name_kk}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                placeholder="Например: Датчиктер өрісі"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="flex-1 px-4 py-2.5 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors"
              >
                {loading ? t('creating') : t('create')}
              </button>
            </div>
          </form>
        </div>
      </div>

      <CreateOperationModal
        isOpen={isCreateOperationOpen}
        onClose={() => setIsCreateOperationOpen(false)}
        onSuccess={handleOperationCreated}
      />
    </>
  );
}