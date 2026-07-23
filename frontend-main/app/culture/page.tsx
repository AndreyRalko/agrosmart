'use client';

import { useState, useEffect } from 'react';
import { getVarieties, deleteVariety } from '@/lib/api/culture-operations/variety';
import { getCultures } from '@/lib/api/culture-operations/culture';
import { getByCultureVariety } from '@/lib/api/agro-operations/custom';
import { getOperationAlerts } from '@/lib/api/agro-operations/alert';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { Variety } from '@/lib/types/culture-operations/variety';
import type { Culture } from '@/lib/types/culture-operations/culture';
import type { OperationAlert } from '@/lib/api/agro-operations/alert';
import CreateCultureModal from '@/components/culture/CreateCultureModal';
import CreateVarietyModal from '@/components/culture/CreateVarietyModal';
import EditCultureModal from '@/components/culture/EditCultureModal';
import EditVarietyModal from '@/components/culture/EditVarietyModal';

type VarietyOperationsMap = Record<number, string[]>;

// variety.id -> alerts
type VarietyAlertsMap = Record<number, OperationAlert[]>;

const ALERT_MESSAGES: Record<string, string> = {
  NOT_ALL_REQ_FIELD: 'Не все обязательные условия заполнены',
};

export default function Page() {
  const { t } = useTranslation();
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [cultures, setCultures] = useState<Culture[]>([]);
  const [varietyOperations, setVarietyOperations] = useState<VarietyOperationsMap>({});
  const [varietyAlerts, setVarietyAlerts] = useState<VarietyAlertsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isCreateVarietyOpen, setIsCreateVarietyOpen] = useState(false);
  const [isCreateCultureOpen, setIsCreateCultureOpen] = useState(false);
  const [isEditCultureOpen, setIsEditCultureOpen] = useState(false);
  const [isEditVarietyOpen, setIsEditVarietyOpen] = useState(false);
  
  const [selectedCulture, setSelectedCulture] = useState<Culture | null>(null);
  const [selectedVariety, setSelectedVariety] = useState<Variety | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [varietiesData, culturesData, alertsData] = await Promise.all([
        getVarieties(),
        getCultures(),
        getOperationAlerts(),
      ]);
      const varietiesList = varietiesData.results || [];
      setVarieties(varietiesList);
      setCultures(culturesData.results || []);

      // Группируем алерты по variety.id
      const alertsMap: VarietyAlertsMap = {};
      for (const alert of alertsData.results || []) {
        const vid = alert.culture_variety.id;
        if (!alertsMap[vid]) alertsMap[vid] = [];
        alertsMap[vid].push(alert);
      }
      setVarietyAlerts(alertsMap);

      // Загружаем операции для каждого сорта параллельно
      const operationsEntries = await Promise.all(
        varietiesList.map(async (variety) => {
          try {
            const data = await getByCultureVariety(variety.id);
            const names = data.results.map(op => op.name);
            return [variety.id, names] as [number, string[]];
          } catch {
            return [variety.id, []] as [number, string[]];
          }
        })
      );
      setVarietyOperations(Object.fromEntries(operationsEntries));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">Сорта культур</h1>
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900 mb-2">Сорта культур</h1>
        <p className="text-neutral-600">Управление сортами и их условиями</p>
      </div>

      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setIsCreateVarietyOpen(true)}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium hover:bg-green-700 flex items-center gap-2 transition-colors rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Добавить сорт
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-600 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {varieties.map((variety) => {
          const culture = cultures.find(c => c.varieties.some(v => v.id === variety.id));
          const ops = varietyOperations[variety.id] || [];
          const alerts = varietyAlerts[variety.id] || [];

          return (
            <div key={variety.id} className={`bg-white border rounded-lg p-5 hover:shadow-md transition-shadow ${alerts.length > 0 ? 'border-red-300' : 'border-neutral-200'}`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-0.5">{variety.name}</h3>
                  {culture && (
                    <p className="text-sm text-neutral-500">{culture.name}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setSelectedVariety(variety); setIsEditVarietyOpen(true); }}
                    className="p-1.5 text-neutral-500 hover:text-neutral-900 transition-colors"
                    aria-label="Редактировать"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 12h12m-7 5h7" />
                    </svg>
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('Вы уверены что хотите удалить этот сорт?')) {
                        try {
                          await deleteVariety(variety.id);
                          await loadData();
                        } catch (err) {
                          console.error('Failed to delete variety:', err);
                        }
                      }
                    }}
                    className="p-1.5 text-red-500 hover:text-red-700 transition-colors"
                    aria-label="Удалить"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Операции */}
              <div className="mb-3 min-h-[24px]">
                {ops.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {ops.map((opName, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 text-xs rounded"
                      >
                        {opName}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 italic">Нет операций</p>
                )}
              </div>

              {/* Алерты */}
              {alerts.length > 0 && (
                <div className="mb-3 space-y-1.5">
                  {alerts.map(alert => (
                    <div key={alert.id} className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      <span>
                        <span className="font-medium">{alert.operation.name}:</span>{' '}
                        {ALERT_MESSAGES[alert.code] ?? alert.code}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Кнопка подробнее */}
              <button
                onClick={() => { setSelectedVariety(variety); setIsEditVarietyOpen(true); }}
                className="w-full py-2 border border-neutral-300 text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors rounded flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Подробнее
              </button>
            </div>
          );
        })}
      </div>

      {varieties.length === 0 && (
        <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center text-sm text-neutral-500">
          {t('noData')}
        </div>
      )}

      <CreateVarietyModal
        isOpen={isCreateVarietyOpen}
        onClose={() => setIsCreateVarietyOpen(false)}
        onSuccess={loadData}
      />
      <CreateCultureModal
        isOpen={isCreateCultureOpen}
        onClose={() => setIsCreateCultureOpen(false)}
        onSuccess={loadData}
      />
      <EditCultureModal
        isOpen={isEditCultureOpen}
        culture={selectedCulture}
        onClose={() => setIsEditCultureOpen(false)}
        onSuccess={loadData}
      />
      <EditVarietyModal
        isOpen={isEditVarietyOpen}
        variety={selectedVariety}
        cultures={cultures}
        onClose={() => setIsEditVarietyOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}