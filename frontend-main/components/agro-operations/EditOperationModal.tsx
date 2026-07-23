'use client';

import { useState, FormEvent, useEffect } from 'react';
import { getAgroOperation, updateAgroOperation, deleteAgroOperation } from '@/lib/api/agro-operations/operation';
import { getAgroFields, updateAgroField, deleteAgroField } from '@/lib/api/agro-operations/field';
import { getLanguage } from '@/lib/api/client';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { AgroOperation, AgroOperationUpdate } from '@/lib/types/agro-operations/operation';
import type { AgroField } from '@/lib/types/agro-operations/field';
import { formatIntegrationFieldLabel } from '@/lib/constants/integration-metrics';
import CreateFieldModal from './CreateFieldModal';
import EditFieldModal from './EditFieldModal';

interface EditOperationModalProps {
  isOpen: boolean;
  operation: AgroOperation | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditOperationModal({ isOpen, operation, onClose, onSuccess }: EditOperationModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<AgroOperationUpdate>({
    name_ru: '',
    name_kk: '',
  });
  const [operationFields, setOperationFields] = useState<AgroField[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<0 | 1>(0); // 0 = Условия старта, 1 = Индикаторы выполнения

  const [isCreateFieldOpen, setIsCreateFieldOpen] = useState(false);
  const [isEditFieldOpen, setIsEditFieldOpen] = useState(false);
  const [isAddExistingFieldOpen, setIsAddExistingFieldOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<AgroField | null>(null);
  const [allFields, setAllFields] = useState<AgroField[]>([]);

  useEffect(() => {
    if (operation && isOpen) {
      loadOperationDetails();
    }
  }, [operation?.id, isOpen]);

  const loadOperationDetails = async () => {
    if (!operation) return;

    setLoadingDetails(true);
    setError('');

    try {
      const details = await getAgroOperation(operation.id);

      setFormData({
        name_ru: details.name_ru,
        name_kk: details.name_kk,
      });

      await loadOperationFields();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load operation details';
      setError(message);

      if (operation) {
        setFormData({
          name_ru: operation.name_ru || operation.name,
          name_kk: operation.name_kk || operation.name,
        });
        setOperationFields(operation.fields || []);
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadOperationFields = async () => {
  if (!operation) return;
  try {
    const details = await getAgroOperation(operation.id);
    setOperationFields(details.fields || []);
  } catch (err) {
    console.error('Failed to load fields:', err);
    setOperationFields(operation.fields || []);
  }
};

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleDeleteField = async (field: AgroField) => {
    if (!confirm(`Удалить поле "${field.name}"?`)) return;

    try {
      await deleteAgroField(field.id);
      await loadOperationFields();
    } catch (err) {
      console.error('Failed to delete field:', err);
      alert('Не удалось удалить поле');
    }
  };

  const handleAttachField = async (field: AgroField) => {
    if (!operation) return;

    try {
      await updateAgroField(field.id, { operation: operation.id });
      await loadOperationFields();
      setIsAddExistingFieldOpen(false);
    } catch (err) {
      console.error('Failed to attach field:', err);
      alert('Не удалось прикрепить поле');
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!operation) return;

    setLoading(true);
    setError('');

    try {
      const currentLang = getLanguage();
      const updateData: Partial<AgroOperationUpdate> = {};

      if (currentLang === 'kk') {
        updateData.name_kk = formData.name_kk;
      } else {
        updateData.name_ru = formData.name_ru;
      }

      await updateAgroOperation(operation.id, updateData as AgroOperationUpdate);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update operation';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!operation || !confirm('Вы уверены что хотите удалить эту операцию?')) return;

    setLoading(true);
    setError('');

    try {
      await deleteAgroOperation(operation.id);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete operation';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !operation) return null;

  const filteredFields = operationFields.filter(f => f.type === activeTab);
  const startCount = operationFields.filter(f => f.type === 0).length;
  const indicatorCount = operationFields.filter(f => f.type === 1).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">Редактировать операцию</h2>
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
              <div className="font-medium text-neutral-900 mb-1">Операция:</div>
              <div className="text-neutral-700">{operation.name}</div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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

              {/* Поля операции */}
              <div className="border-t border-neutral-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-neutral-700">
                    Поля операции ({operationFields.length})
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddExistingFieldOpen(true)}
                      className="px-3 py-1.5 border border-neutral-300 text-neutral-700 text-xs font-medium hover:bg-neutral-50"
                    >
                      Добавить существующее
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreateFieldOpen(true)}
                      disabled={!operation?.id}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                    >
                      + Создать новое
                    </button>
                  </div>
                </div>

                {/* Табы */}
                <div className="flex border border-neutral-200 mb-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab(0)}
                    className="flex-1 px-3 py-2 text-xs font-medium transition-colors"
                    style={activeTab === 0
                      ? { backgroundColor: '#1e3a5f', color: '#fff' }
                      : { backgroundColor: '#fff', color: '#525252' }
                    }
                  >
                    Условия старта
                    <span
                      className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs"
                      style={activeTab === 0
                        ? { backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }
                        : { backgroundColor: '#f5f5f5', color: '#737373' }
                      }
                    >
                      {startCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab(1)}
                    className="flex-1 px-3 py-2 text-xs font-medium transition-colors border-l border-neutral-200"
                    style={activeTab === 1
                      ? { backgroundColor: '#14532d', color: '#fff' }
                      : { backgroundColor: '#fff', color: '#525252' }
                    }
                  >
                    Индикаторы выполнения
                    <span
                      className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs"
                      style={activeTab === 1
                        ? { backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }
                        : { backgroundColor: '#f5f5f5', color: '#737373' }
                      }
                    >
                      {indicatorCount}
                    </span>
                  </button>
                </div>

                {/* Список полей активного таба */}
                {filteredFields.length > 0 ? (
                  <div className="space-y-2">
                    {filteredFields.map(field => (
                      <div key={field.id} className="flex items-center justify-between p-3 border border-neutral-200 rounded hover:bg-neutral-50">
                        <div className="flex-1">
                          <div className="font-medium text-neutral-900 text-sm">{field.name}</div>
                          <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-2 flex-wrap">
                            {field.required && <span className="text-red-500">Обязательно</span>}
                            {!field.integration && <span>• Ручной ввод</span>}
                            {field.integration && <span>• {field.integration.name}</span>}
                            {field.integration_field && (
                              <span>• {formatIntegrationFieldLabel(field.integration_field)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedField(field);
                              setIsEditFieldOpen(true);
                            }}
                            className="p-1.5 text-neutral-400 hover:text-neutral-900 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteField(field)}
                            className="p-1.5 text-red-400 hover:text-red-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-neutral-400 italic p-6 text-center bg-neutral-50 border border-neutral-200">
                    {activeTab === 0 ? 'Нет полей условий старта' : 'Нет индикаторов выполнения'}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="w-full px-4 py-2.5 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors disabled:bg-neutral-100 disabled:text-neutral-400"
                >
                  Удалить операцию
                </button>
              </div>

              <div className="flex gap-3 pt-2">
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

      <CreateFieldModal
        isOpen={isCreateFieldOpen}
        preselectedOperationId={operation?.id}
        onClose={() => setIsCreateFieldOpen(false)}
        onSuccess={() => {
          loadOperationFields();
          setIsCreateFieldOpen(false);
        }}
      />
      <EditFieldModal
        isOpen={isEditFieldOpen}
        field={selectedField}
        onClose={() => setIsEditFieldOpen(false)}
        onSuccess={() => {
          loadOperationFields();
          setIsEditFieldOpen(false);
        }}
      />

      {isAddExistingFieldOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4"
          onClick={() => setIsAddExistingFieldOpen(false)}
        >
          <div
            className="bg-white w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900">Добавить существующее поле</h3>
              <button
                onClick={() => setIsAddExistingFieldOpen(false)}
                className="text-neutral-500 hover:text-neutral-900"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2">
              {allFields
                .filter(f => f.operation !== operation?.id)
                .map(field => (
                  <button
                    key={field.id}
                    type="button"
                    onClick={() => handleAttachField(field)}
                    className="w-full p-3 border border-neutral-200 rounded text-left hover:bg-green-50 hover:border-green-300 transition-colors"
                  >
                    <div className="font-medium text-neutral-900 text-sm">{field.name}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      <span className={field.type === 0 ? 'text-blue-600' : 'text-green-600'}>
                        {field.type === 0 ? 'Условия старта' : 'Индикаторы выполнения'}
                      </span>
                      {field.required && <span className="ml-2 text-red-500">• Обязательно</span>}
                      {!field.integration && <span className="ml-2 text-neutral-400">• Ручной ввод</span>}
                      {field.integration && <span className="ml-2 text-neutral-400">• {field.integration.name}</span>}
                      {field.integration_field && (
                        <span className="ml-2 text-neutral-400">
                          • {formatIntegrationFieldLabel(field.integration_field)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}

              {allFields.filter(f => f.operation !== operation?.id).length === 0 && (
                <div className="text-sm text-neutral-400 italic p-8 text-center bg-neutral-50 rounded">
                  Нет доступных полей. Все поля уже прикреплены к операциям.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}