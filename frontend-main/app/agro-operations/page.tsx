'use client';

import { useState, useEffect } from 'react';
import { getAgroOperations, deleteAgroOperation } from '@/lib/api/agro-operations/operation';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { AgroOperation } from '@/lib/types/agro-operations/operation';
import CreateOperationModal from '@/components/agro-operations/CreateOperationModal';
import EditOperationModal from '@/components/agro-operations/EditOperationModal';
import ViewOperationModal from '@/components/agro-operations/ViewOperationModal';

export default function OperationsPage() {
  const { t } = useTranslation();
  const [operations, setOperations] = useState<AgroOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<AgroOperation | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAgroOperations();
      setOperations(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load operations');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (operation: AgroOperation) => {
    if (!confirm(`Удалить операцию «${operation.name}»? Параметры операции также будут удалены.`)) return;
    try {
      await deleteAgroOperation(operation.id);
      if (selectedOperation?.id === operation.id) {
        setSelectedOperation(null);
        setIsEditOpen(false);
        setIsViewOpen(false);
      }
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось удалить операцию';
      alert(message);
    }
  };

  const openView = (operation: AgroOperation) => {
    setSelectedOperation(operation);
    setIsViewOpen(true);
  };

  const openEdit = (operation: AgroOperation) => {
    setSelectedOperation(operation);
    setIsEditOpen(true);
  };

  // Переход из просмотра в редактирование
  const handleEditFromView = () => {
    setIsViewOpen(false);
    setIsEditOpen(true);
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">Операции</h1>
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">Операции</h1>
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900 mb-2">Операции</h1>
        <p className="text-neutral-600">Управление агро-операциями и их параметрами</p>
      </div>

      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 text-white text-sm font-medium flex items-center gap-2 transition-colors rounded"
          style={{ backgroundColor: '#16a34a' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#15803d')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#16a34a')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Добавить операцию
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {operations.map((operation) => {
          const startFields = (operation.fields || []).filter(f => f.type === 0);
          const indicatorFields = (operation.fields || []).filter(f => f.type === 1);

          return (
            <div key={operation.id} className="bg-white border border-neutral-200 rounded-lg p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-neutral-900">{operation.name}</h3>
                  <p className="text-sm text-neutral-500 mt-0.5">{operation.fields?.length || 0} полей</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(operation)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-900 transition-colors"
                    aria-label="Редактировать"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Условия старта */}
              {startFields.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1.5 px-2 py-1 inline-block rounded"
                    style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                    Условия старта · {startFields.length}
                  </div>
                  <div className="space-y-1">
                    {startFields.slice(0, 3).map(field => (
                      <div key={field.id} className="flex items-center gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#3b82f6' }} />
                        <span className="text-neutral-700">{field.name_ru || field.name}</span>
                        {field.integration && (
                          <span className="px-1.5 py-0.5 text-xs rounded" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                            {field.integration.name}
                          </span>
                        )}
                        {field.required && <span className="text-xs" style={{ color: '#ef4444' }}>*</span>}
                      </div>
                    ))}
                    {startFields.length > 3 && <p className="text-xs italic" style={{ color: '#94a3b8' }}>+{startFields.length - 3} ещё</p>}
                  </div>
                </div>
              )}

              {/* Индикаторы выполнения */}
              {indicatorFields.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1.5 px-2 py-1 inline-block rounded"
                    style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}>
                    Индикаторы выполнения · {indicatorFields.length}
                  </div>
                  <div className="space-y-1">
                    {indicatorFields.slice(0, 3).map(field => (
                      <div key={field.id} className="flex items-center gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#22c55e' }} />
                        <span className="text-neutral-700">{field.name_ru || field.name}</span>
                        {field.integration && (
                          <span className="px-1.5 py-0.5 text-xs rounded" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                            {field.integration.name}
                          </span>
                        )}
                        {field.required && <span className="text-xs" style={{ color: '#ef4444' }}>*</span>}
                      </div>
                    ))}
                    {indicatorFields.length > 3 && <p className="text-xs italic" style={{ color: '#94a3b8' }}>+{indicatorFields.length - 3} ещё</p>}
                  </div>
                </div>
              )}

              {(!operation.fields || operation.fields.length === 0) && (
                <p className="text-sm text-neutral-400 italic mb-3">Нет полей в этой операции</p>
              )}

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => openView(operation)}
                  className="flex-1 py-2 border border-neutral-200 text-neutral-600 text-sm font-medium hover:bg-neutral-50 transition-colors rounded flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Подробнее
                </button>
                <button
                  onClick={() => openEdit(operation)}
                  className="px-3 py-2 border border-neutral-200 text-neutral-600 text-sm font-medium hover:bg-neutral-50 transition-colors rounded"
                  aria-label="Редактировать"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(operation)}
                  className="px-3 py-2 border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors rounded"
                >
                  Удалить
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {operations.length === 0 && (
        <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center text-sm text-neutral-500">
          {t('noData')}
        </div>
      )}

      <CreateOperationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => { loadData(); setIsCreateOpen(false); }}
      />

      <ViewOperationModal
        isOpen={isViewOpen}
        operationId={selectedOperation?.id ?? null}
        onClose={() => setIsViewOpen(false)}
        onEdit={handleEditFromView}
        onDelete={selectedOperation ? () => handleDelete(selectedOperation) : undefined}
      />

      <EditOperationModal
        isOpen={isEditOpen}
        operation={selectedOperation}
        onClose={() => setIsEditOpen(false)}
        onSuccess={() => { loadData(); setIsEditOpen(false); }}
      />
    </div>
  );
}