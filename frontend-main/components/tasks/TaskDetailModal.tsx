'use client';

import { useState, useEffect } from 'react';
import { getTask } from '@/lib/api/tasks/task';
import type { Task, TaskStatus } from '@/lib/types/tasks/task';

interface TaskDetailModalProps {
  isOpen: boolean;
  taskId: number | null;
  onClose: () => void;
  onDelete?: () => void;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; style: React.CSSProperties }> = {
  created: {
    label: 'Создано',
    style: { backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
  },
  pending: {
    label: 'Ожидает',
    style: { backgroundColor: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb' },
  },
  in_progress: {
    label: 'В работе',
    style: { backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' },
  },
  completed: {
    label: 'Завершено',
    style: { backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' },
  },
};

function getFullName(user: { lastname: string; firstname: string; patronymic: string | null }) {
  return [user.lastname, user.firstname, user.patronymic].filter(Boolean).join(' ');
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function TaskDetailModal({ isOpen, taskId, onClose, onDelete }: TaskDetailModalProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !taskId) return;
    fetchTask(taskId);
  }, [isOpen, taskId]);

  const fetchTask = async (id: number) => {
    setIsLoading(true);
    setError(null);
    setTask(null);
    try {
      const data = await getTask(id);
      setTask(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки задания');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTask(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const statusConfig = task ? STATUS_CONFIG[task.status] : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">Детали задания</h2>
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                onClick={onDelete}
                className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                Удалить
              </button>
            )}
            <button onClick={handleClose} className="text-neutral-500 hover:text-neutral-900 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Loading */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-neutral-900" />
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div className="p-3 bg-red-50 border-l-4 border-red-600 text-red-800 text-sm">{error}</div>
          )}

          {/* Content */}
          {task && !isLoading && (
            <div className="space-y-5">
              {/* Операция + статус */}
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-neutral-900">{task.operation.name_ru}</h3>
                {statusConfig && (
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                    style={statusConfig.style}
                  >
                    {statusConfig.label}
                  </span>
                )}
              </div>

              {/* Основная инфа */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-neutral-500 mb-0.5">Сорт</p>
                  <p className="text-neutral-900 font-medium">{task.culture_variety.name_ru}</p>
                </div>
                <div>
                  <p className="text-neutral-500 mb-0.5">Поле</p>
                  <p className="text-neutral-900 font-medium">№{task.physical_field.no}</p>
                </div>
                <div>
                  <p className="text-neutral-500 mb-0.5">Срок выполнения</p>
                  <p className="text-neutral-900 font-medium">{formatDate(task.deadline)}</p>
                </div>
                <div>
                  <p className="text-neutral-500 mb-0.5">Ответственный</p>
                  <p className="text-neutral-900 font-medium">{getFullName(task.responsible)}</p>
                </div>
                {task.creator && (
                  <div>
                    <p className="text-neutral-500 mb-0.5">Создал</p>
                    <p className="text-neutral-900 font-medium">{getFullName(task.creator)}</p>
                  </div>
                )}
              </div>

              {/* Примечание */}
              {task.note && (
                <div className="p-3 bg-neutral-50 border border-neutral-200 text-sm text-neutral-700">
                  <p className="text-neutral-500 text-xs mb-1">Примечание</p>
                  {task.note}
                </div>
              )}

              {/* Параметры */}
              {task.field_values && task.field_values.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">
                    Параметры задания
                  </p>
                  <div className="space-y-2">
                    {task.field_values.map((fv) => {
                      const conditionStr = Object.entries(fv.condition ?? {})
                        .map(([op, val]) => {
                          const labels: Record<string, string> = { lt: '<', lte: '≤', gt: '>', gte: '≥', eq: '=' };
                          return `${labels[op] ?? op} ${val}`;
                        })
                        .join(', ');

                      const hasValue = fv.value_numeric !== null && fv.value_numeric !== undefined;
                      const numericValue = hasValue ? Number(fv.value_numeric) : null;  
                      const conditionMet =
                        hasValue && fv.condition
                                ? Object.entries(fv.condition).every(([op, val]) => {
                                    const v = numericValue!;
                                    const threshold = val;
                              if (op === 'lt') return v < threshold;
                              if (op === 'lte') return v <= threshold;
                              if (op === 'gt') return v > threshold;
                              if (op === 'gte') return v >= threshold;
                              if (op === 'eq') return v === threshold;
                              return true;
                            })
                          : null;

                      return (
                        <div
                          key={fv.id}
                          className="flex items-center justify-between px-4 py-3 border border-neutral-200"
                          style={{ backgroundColor: '#fafafa' }}
                        >
                          <div>
                            <p className="text-sm font-medium text-neutral-800">
                              {fv.field_name_ru || fv.field_name}
                            </p>
                            {conditionStr && (
                              <p className="text-xs text-neutral-400 mt-0.5">Условие: {conditionStr}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-neutral-900">
                              {hasValue ? Number(fv.value_numeric).toFixed(2) : '—'}

                            </span>
                            {conditionMet !== null && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={
                                  conditionMet
                                    ? { backgroundColor: '#dcfce7', color: '#15803d' }
                                    : { backgroundColor: '#fee2e2', color: '#b91c1c' }
                                }
                              >
                                {conditionMet ? '✓' : '✗'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}