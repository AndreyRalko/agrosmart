'use client';

import { useEffect, useState } from 'react';
import { getNotifications, markNotificationRead } from '@/lib/api/notification/notification';
import type { CheckedCondition, Notification } from '@/lib/types/notification/notification';

const CONDITION_LABELS: Record<string, string> = {
  lt: '<',
  lte: '≤',
  gt: '>',
  gte: '≥',
  eq: '=',
  ne: '≠',
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCondition(condition: CheckedCondition) {
  return Object.entries(condition.condition)
    .map(([op, val]) => `${CONDITION_LABELS[op] ?? op} ${val}`)
    .join(', ');
}

function fieldLabel(fieldNo: string) {
  return fieldNo.startsWith('Поле') ? fieldNo : `Поле №${fieldNo}`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getNotifications();
      setNotifications(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки уведомлений');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(item => (item.id === id ? { ...item, status: 'read' } : item)));
    } catch {
      setError('Не удалось отметить уведомление прочитанным');
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(item => item.status === 'sent');
    try {
      await Promise.all(unread.map(item => markNotificationRead(item.id)));
      setNotifications(prev => prev.map(item => ({ ...item, status: 'read' })));
    } catch {
      setError('Не удалось отметить уведомления прочитанными');
    }
  };

  const unreadCount = notifications.filter(item => item.status === 'sent').length;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 mb-1">Уведомления</h1>
          <p className="text-sm text-neutral-500">
            Сообщения о подходящих условиях для агроопераций по полям.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="shrink-0 px-4 py-2 text-sm font-medium border border-neutral-200 text-neutral-700 rounded hover:bg-neutral-50"
          >
            Прочитать все
          </button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-neutral-900" />
        </div>
      )}

      {error && !loading && (
        <div className="p-3 bg-red-50 border-l-4 border-red-600 text-red-800 text-sm mb-4">{error}</div>
      )}

      {!loading && !error && notifications.length === 0 && (
        <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
          <p className="text-neutral-400 text-sm">Нет уведомлений</p>
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map(item => {
            const ctx = item.context_data;
            const isUnread = item.status === 'sent';
            return (
              <article
                key={item.id}
                className="bg-white border border-neutral-200 rounded-lg p-5"
                style={isUnread ? { borderColor: '#bbf7d0' } : undefined}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#3b82f6' }} />
                      )}
                      <h2 className="text-base font-semibold text-neutral-900">
                        {item.title || ctx?.operation_name_ru || 'Уведомление'}
                      </h2>
                    </div>
                    {ctx && (
                      <p className="text-sm text-neutral-600 mb-2">
                        {ctx.operation_name_ru} · {fieldLabel(ctx.field_no)} · {ctx.culture_variety_name_ru}
                      </p>
                    )}
                    <p className="text-sm text-neutral-800">{item.msg}</p>
                    {ctx?.checked_conditions?.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {ctx.checked_conditions.map((condition, index) => (
                          <p key={index} className="text-xs" style={{ color: '#16a34a' }}>
                            {condition.field_name}: {condition.value_numeric} ({formatCondition(condition)})
                          </p>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-neutral-400 mt-3">{formatTime(ctx?.time || item.created_at)}</p>
                  </div>
                  {isUnread && (
                    <button
                      onClick={() => handleMarkRead(item.id)}
                      className="shrink-0 px-3 py-1.5 text-xs font-medium border rounded"
                      style={{ borderColor: '#16a34a', color: '#16a34a', backgroundColor: '#f0fdf4' }}
                    >
                      Прочитано
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
