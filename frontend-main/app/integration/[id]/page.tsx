'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getIntegration, runIntegrationTask } from '@/lib/api/integration/integration';
import { getIntegrationDataFields } from '@/lib/api/integration/integration-data-field';
import { getIntegrationLogs } from '@/lib/api/integration/integration-log';
import { getFields } from '@/lib/api/field/field';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { getProviderLabel } from '@/lib/constants/integration-providers';
import {
  formatMetricValue,
  getColumnsForProvider,
  getMetricLabel,
} from '@/lib/constants/integration-metrics';
import type { IntegrationDetail } from '@/lib/types/integration/integration';
import type { IntegrationDataField } from '@/lib/types/integration/integration-data-field';
import type { IntegrationLog } from '@/lib/types/integration/integration-log';
import type { Field } from '@/lib/types/field/field';

type Tab = 'data' | 'logs';

const PAGE_SIZE = 50;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function IntegrationDetailPage() {
  const params = useParams();
  const integrationId = Number(params.id);
  const { t } = useTranslation();

  const [integration, setIntegration] = useState<IntegrationDetail | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [dataRows, setDataRows] = useState<IntegrationDataField[]>([]);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [dataCount, setDataCount] = useState(0);
  const [logsCount, setLogsCount] = useState(0);
  const [dataPage, setDataPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const [fieldFilter, setFieldFilter] = useState<number | ''>('');
  const [tab, setTab] = useState<Tab>('data');
  const [loading, setLoading] = useState(true);
  const [loadingTab, setLoadingTab] = useState(false);
  const [runningTask, setRunningTask] = useState(false);
  const [error, setError] = useState('');
  const [taskMessage, setTaskMessage] = useState('');

  const loadIntegration = useCallback(async () => {
    const detail = await getIntegration(integrationId);
    setIntegration(detail);
    return detail;
  }, [integrationId]);

  const loadFields = useCallback(async () => {
    const response = await getFields();
    setFields(response.results || []);
  }, []);

  const loadData = useCallback(async () => {
    const response = await getIntegrationDataFields({
      integration: integrationId,
      field: fieldFilter || undefined,
      page: dataPage,
      page_size: PAGE_SIZE,
    });
    setDataRows(response.results || []);
    setDataCount(response.count || 0);
  }, [integrationId, fieldFilter, dataPage]);

  const loadLogs = useCallback(async () => {
    const response = await getIntegrationLogs({
      integration: integrationId,
      page: logsPage,
      page_size: PAGE_SIZE,
    });
    setLogs(response.results || []);
    setLogsCount(response.count || 0);
  }, [integrationId, logsPage]);

  useEffect(() => {
    if (!integrationId || Number.isNaN(integrationId)) return;

    const init = async () => {
      try {
        setLoading(true);
        setError('');
        await Promise.all([loadIntegration(), loadFields()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить интеграцию');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [integrationId, loadIntegration, loadFields]);

  useEffect(() => {
    if (!integrationId || loading) return;

    const loadTab = async () => {
      try {
        setLoadingTab(true);
        setError('');
        if (tab === 'data') {
          await loadData();
        } else {
          await loadLogs();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить данные');
      } finally {
        setLoadingTab(false);
      }
    };

    loadTab();
  }, [tab, integrationId, loading, loadData, loadLogs]);

  const handleRunTask = async () => {
    try {
      setRunningTask(true);
      setTaskMessage('');
      setError('');
      const result = await runIntegrationTask(integrationId);
      if (result.result) {
        const rows = result.result.created_rows ?? 0;
        const failed = result.result.api_calls_failed ?? 0;
        setTaskMessage(
          failed > 0
            ? `Собрано записей: ${rows}. Ошибок API: ${failed}.`
            : `Собрано записей: ${rows}.`,
        );
        setDataPage(1);
        setLogsPage(1);
        await Promise.all([loadData(), loadLogs()]);
      } else {
        setTaskMessage(`Задача запущена (id: ${result.task_id}). Обновите страницу через минуту.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось запустить сбор данных');
    } finally {
      setRunningTask(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setLoadingTab(true);
      setError('');
      if (tab === 'data') {
        await loadData();
      } else {
        await loadLogs();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить');
    } finally {
      setLoadingTab(false);
    }
  };

  const columns = getColumnsForProvider(
    integration?.api,
    dataRows[0]?.data as Record<string, unknown> | undefined,
  );

  const dataPages = Math.max(1, Math.ceil(dataCount / PAGE_SIZE));
  const logsPages = Math.max(1, Math.ceil(logsCount / PAGE_SIZE));

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-sm text-neutral-500">{t('loading')}</p>
      </div>
    );
  }

  if (!integration) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-sm text-red-600">{error || 'Интеграция не найдена'}</p>
        <Link href="/integration" className="text-sm text-neutral-600 hover:text-neutral-900 mt-4 inline-block">
          ← К списку интеграций
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <Link
        href="/integration"
        className="text-sm text-neutral-600 hover:text-neutral-900 mb-4 inline-flex items-center gap-1"
      >
        ← Интеграции
      </Link>

      <div className="mb-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            {integration.icon && <span className="text-2xl">{integration.icon}</span>}
            <h1 className="text-xl font-semibold text-neutral-900">
              {integration.name_ru || integration.name_kk}
            </h1>
          </div>
          <p className="text-sm text-neutral-500">
            {getProviderLabel(integration.api)}
            {integration.api ? null : ' · провайдер не настроен'}
            {' · '}
            обновление каждые {integration.every_minute} мин
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loadingTab}
            className="px-4 py-2 border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            {loadingTab ? 'Загрузка…' : 'Обновить'}
          </button>
          <button
            type="button"
            onClick={handleRunTask}
            disabled={runningTask || !integration.api}
            className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-400"
          >
            {runningTask ? 'Запуск…' : 'Собрать данные'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-600 text-red-800 text-sm">{error}</div>
      )}
      {taskMessage && (
        <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-600 text-green-800 text-sm">{taskMessage}</div>
      )}

      <div className="flex gap-1 mb-4 border-b border-neutral-200">
        <button
          type="button"
          onClick={() => setTab('data')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'data'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Данные ({dataCount})
        </button>
        <button
          type="button"
          onClick={() => setTab('logs')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'logs'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Логи ({logsCount})
        </button>
      </div>

      {tab === 'data' && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Поле</label>
            <select
              value={fieldFilter}
              onChange={(e) => {
                setFieldFilter(e.target.value ? Number(e.target.value) : '');
                setDataPage(1);
              }}
              className="w-full md:w-64 px-3 py-2 bg-white border border-neutral-300 text-sm"
            >
              <option value="">Все поля</option>
              {fields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.no}
                </option>
              ))}
            </select>
          </div>

          {dataRows.length === 0 ? (
            <div className="bg-white border border-neutral-200 p-8 text-center text-sm text-neutral-500">
              {integration.api ? 'Нет данных. Нажмите «Собрать данные».' : 'Настройте провайдера и API-ключ.'}
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-neutral-600">Время</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-600">Поле</th>
                    {columns.map((col) => (
                      <th key={col} className="px-4 py-3 text-left font-medium text-neutral-600 whitespace-nowrap">
                        {getMetricLabel(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {dataRows.map((row) => (
                    <tr key={row.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 whitespace-nowrap text-neutral-900">{formatDateTime(row.time)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-neutral-700">{row.field.no}</td>
                      {columns.map((col) => (
                        <td key={col} className="px-4 py-3 whitespace-nowrap text-neutral-700">
                          {formatMetricValue((row.data as Record<string, unknown>)?.[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {dataPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-neutral-500">
                Страница {dataPage} из {dataPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={dataPage <= 1}
                  onClick={() => setDataPage((p) => p - 1)}
                  className="px-3 py-1 border border-neutral-300 disabled:opacity-40"
                >
                  Назад
                </button>
                <button
                  type="button"
                  disabled={dataPage >= dataPages}
                  onClick={() => setDataPage((p) => p + 1)}
                  className="px-3 py-1 border border-neutral-300 disabled:opacity-40"
                >
                  Вперёд
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'logs' && (
        <>
          {logs.length === 0 ? (
            <div className="bg-white border border-neutral-200 p-8 text-center text-sm text-neutral-500">
              Логов пока нет
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-neutral-600">Время</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-600">Статус</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-600">HTTP</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-600">Ошибка</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-600">Детали</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium ${
                            log.status === 1
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {log.status_display}
                        </span>
                      </td>
                      <td className="px-4 py-3">{log.http_status ?? '—'}</td>
                      <td className="px-4 py-3 text-neutral-600">{log.error_type ?? '—'}</td>
                      <td className="px-4 py-3 text-neutral-600 max-w-xs truncate">
                        {log.error?.reason ?? log.error?.stage ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {logsPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-neutral-500">
                Страница {logsPage} из {logsPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={logsPage <= 1}
                  onClick={() => setLogsPage((p) => p - 1)}
                  className="px-3 py-1 border border-neutral-300 disabled:opacity-40"
                >
                  Назад
                </button>
                <button
                  type="button"
                  disabled={logsPage >= logsPages}
                  onClick={() => setLogsPage((p) => p + 1)}
                  className="px-3 py-1 border border-neutral-300 disabled:opacity-40"
                >
                  Вперёд
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
