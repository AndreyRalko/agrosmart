'use client';

import { useState, useEffect } from 'react';
import { getIntegrationLogs } from '@/lib/api/integration/integration-log';
import type { IntegrationLog } from '@/lib/types/integration/integration-log';

interface Stats {
  success: number;
  failed: number;
  pending: number;
  total: number;
}

interface ErrorStats {
  type: string;
  count: number;
  message: string;
}

export default function IntegrationStatsWidget() {
  const [stats, setStats] = useState<Stats>({ success: 0, failed: 0, pending: 0, total: 0 });
  const [topErrors, setTopErrors] = useState<ErrorStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    
    // Автообновление каждые 15 минут
    const interval = setInterval(() => {
      loadStats();
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Загружаем логи за последние 24 часа
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const data = await getIntegrationLogs({
        created_at_after: yesterday.toISOString(),
      });

      // Подсчитываем статистику
      const logs = data.results;
      const success = logs.filter(l => l.status === 1).length;
      const failed = logs.filter(l => l.status === -1).length;
      const pending = logs.filter(l => l.status === 0).length;

      setStats({
        success,
        failed,
        pending,
        total: logs.length,
      });

      // Подсчитываем топ ошибок (группируем по сообщению)
      const errorMap = new Map<string, number>();
      
      logs.filter(l => l.status === -1 && l.error).forEach(log => {
        // Формируем понятное сообщение ошибки
        let message = 'Unknown error';
        
        if (log.http_status === 429) {
          message = 'Too Many Calls (HTTP 429)';
        } else if (log.http_status) {
          message = `HTTP ${log.http_status}`;
        } else if (log.error_type) {
          message = log.error_type;
        }
        
        // Пытаемся извлечь более детальное сообщение
        if (log.error?.response_text_snippet) {
          try {
            const parsed = JSON.parse(log.error.response_text_snippet);
            if (parsed.type && log.http_status === 429) {
              message = parsed.type;
            }
          } catch {}
        }
        
        const currentCount = errorMap.get(message) || 0;
        errorMap.set(message, currentCount + 1);
      });

      // Сортируем по количеству и берем топ 3
      const topErrorsList = Array.from(errorMap.entries())
        .map(([message, count]) => ({ type: message, message, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      setTopErrors(topErrorsList);
    } catch (err) {
      console.error('Failed to load integration stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-neutral-200 rounded w-1/3"></div>
          <div className="h-20 bg-neutral-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">Интеграции (24ч)</h3>
        <button
          onClick={loadStats}
          className="text-neutral-500 hover:text-neutral-900 transition-colors"
          title="Обновить"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.success.toLocaleString()}</div>
          <div className="text-xs text-neutral-600 mt-1">✓ Success</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{stats.failed.toLocaleString()}</div>
          <div className="text-xs text-neutral-600 mt-1">✗ Failed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending.toLocaleString()}</div>
          <div className="text-xs text-neutral-600 mt-1">⏳ Pending</div>
        </div>
      </div>

      {/* Топ ошибок */}
      {topErrors.length > 0 && (
        <div className="border-t border-neutral-200 pt-4">
          <div className="text-sm font-medium text-neutral-700 mb-2">Top errors:</div>
          <div className="space-y-1.5">
            {topErrors.map((error, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">{error.message}</span>
                <span className="font-medium text-neutral-900">{error.count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.total === 0 && (
        <div className="text-center text-sm text-neutral-500 py-4">
          Нет данных за последние 24 часа
        </div>
      )}
    </div>
  );
}