'use client';

import { useState, useEffect } from 'react';
import { getTasks, deleteTask } from '@/lib/api/tasks/task';
import type { Task, TaskStatus } from '@/lib/types/tasks/task';
import CreateTaskModal from '@/components/tasks/CreateTaskModal';
import TaskDetailModal from '@/components/tasks/TaskDetailModal';

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: string; style: React.CSSProperties }> = {
  created: {
    label: 'Создано',
    icon: '📋',
    style: { backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
  },
  pending: {
    label: 'Ожидает',
    icon: '⏱',
    style: { backgroundColor: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb' },
  },
  in_progress: {
    label: 'В работе',
    icon: '🔄',
    style: { backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' },
  },
  completed: {
    label: 'Завершено',
    icon: '✓',
    style: { backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' },
  },
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getTasks();
      setTasks(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки заданий');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDeadline = (deadline: string) => {
    return new Date(deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getFullName = (user: Task['responsible']) => {
    return [user.lastname, user.firstname, user.patronymic].filter(Boolean).join(' ');
  };

  const handleDelete = async (task: Task) => {
    if (!confirm(`Удалить задание «${task.operation.name_ru}» (поле №${task.physical_field.no})?`)) return;
    try {
      await deleteTask(task.id);
      if (selectedTaskId === task.id) {
        setSelectedTaskId(null);
      }
      await fetchTasks();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось удалить задание';
      alert(message);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-1">Задания</h1>
          <p className="text-neutral-600">Управление и назначение задач</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 text-white text-sm font-medium flex items-center gap-2 transition-colors rounded-lg shadow-sm"
          style={{ backgroundColor: '#16a34a' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#15803d')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#16a34a')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Создать задание
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      )}

      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={fetchTasks} className="text-sm text-red-700 underline hover:no-underline">
            Повторить
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-4">
          {tasks.map((task) => {
            const statusConfig = STATUS_CONFIG[task.status];
            return (
              <div
                key={task.id}
                className="bg-white border border-neutral-200 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                      {task.operation.name_ru}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600">
                      <span>{task.culture_variety.name_ru}</span>
                      <span>•</span>
                      <span>Поле №{task.physical_field.no}</span>
                      <span>•</span>
                      <span>Срок: {formatDeadline(task.deadline)}</span>
                    </div>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-3"
                    style={statusConfig.style}
                  >
                    {statusConfig.icon} {statusConfig.label}
                  </span>
                </div>

                <div className="mb-3 text-sm text-neutral-700">
                  <span className="text-neutral-500">Ответственный:</span>{' '}
                  {getFullName(task.responsible)}
                </div>

                {task.note && (
                  <div className="mb-3 text-sm text-neutral-600 bg-neutral-50 rounded px-3 py-2">
                    {task.note}
                  </div>
                )}

                <div className="flex gap-2 pt-3 border-t border-neutral-200">
                  <button
                    onClick={() => setSelectedTaskId(task.id)}
                    className="flex-1 px-3 py-1.5 text-sm text-neutral-700 border border-neutral-300 rounded hover:bg-neutral-50 transition-colors"
                  >
                    Подробнее
                  </button>
                  <button
                    onClick={() => handleDelete(task)}
                    className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            );
          })}

          {tasks.length === 0 && (
            <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
              <p className="text-neutral-500 mb-4">Нет заданий</p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 text-white text-sm font-medium rounded-lg"
                style={{ backgroundColor: '#16a34a' }}
              >
                Создать первое задание
              </button>
            </div>
          )}
        </div>
      )}

      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchTasks}
      />

      <TaskDetailModal
        isOpen={selectedTaskId !== null}
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onDelete={selectedTaskId !== null ? () => {
          const task = tasks.find(t => t.id === selectedTaskId);
          if (task) handleDelete(task);
        } : undefined}
      />
    </div>
  );
}