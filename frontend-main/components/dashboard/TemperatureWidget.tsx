'use client';

import { useState, useEffect } from 'react';
import { getFields } from '@/lib/api/field/field';
import { getIntegrations } from '@/lib/api/integration/integration';
import { getLastIntegrationDataField } from '@/lib/api/integration/integration-data-field';
import type { WeatherData } from '@/lib/types/integration/integration-data-field';
import { getCurrentDt, getCurrentHourLabel } from '@/lib/utils/datetime';

interface FieldTemperature {
  fieldId: number;
  fieldNo: string;
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  time: string;
}

export default function TemperatureWidget() {
  const [fields, setFields] = useState<FieldTemperature[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [hourLabel, setHourLabel] = useState(getCurrentHourLabel());

  useEffect(() => {
    loadTemperatures();

    const interval = setInterval(() => {
      loadTemperatures();
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const loadTemperatures = async () => {
    try {
      setLoading(true);
      setHourLabel(getCurrentHourLabel());

      const [integrationsRes, fieldsRes] = await Promise.all([
        getIntegrations(),
        getFields(),
      ]);

      const weatherIntegration = (integrationsRes.results || []).find(i => i.api === 'tomorrow.io');
      if (!weatherIntegration) {
        setFields([]);
        return;
      }

      const dt = getCurrentDt();
      const physicalFields = fieldsRes.results || [];

      const results = await Promise.allSettled(
        physicalFields.map(field =>
          getLastIntegrationDataField({
            integration_id: weatherIntegration.id,
            field_id: field.id,
            dt,
          })
        )
      );

      const fieldsList: FieldTemperature[] = [];

      results.forEach((result, index) => {
        if (result.status !== 'fulfilled') return;

        const record = result.value;
        const data = record.data as WeatherData;
        const field = physicalFields[index];

        fieldsList.push({
          fieldId: field.id,
          fieldNo: field.no,
          temperature: data.temperature_c ?? null,
          humidity: data.humidity_percent ?? null,
          windSpeed: data.wind_speed_m_s ?? null,
          time: record.time,
        });
      });

      fieldsList.sort((a, b) => a.fieldNo.localeCompare(b.fieldNo, 'ru'));
      setFields(fieldsList);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to load temperatures:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatRecordTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && fields.length === 0) {
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
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold text-neutral-900">Погода на полях</h3>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-neutral-500">
              {lastUpdate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={loadTemperatures}
            disabled={loading}
            className="text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-50"
            title="Обновить"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
      <p className="text-xs text-neutral-500 mb-4">Параметры на {hourLabel}</p>

      {fields.length > 0 ? (
        <div className="space-y-3">
          {fields.slice(0, 4).map(field => (
            <div key={field.fieldId} className="flex items-center justify-between p-3 bg-neutral-50 rounded border border-neutral-200">
              <div className="flex-1">
                <div className="font-medium text-neutral-900 text-sm">{field.fieldNo}</div>
                <div className="text-xs text-neutral-500 mt-0.5">{formatRecordTime(field.time)}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-lg font-semibold text-neutral-900">
                    {field.temperature != null ? `${field.temperature.toFixed(1)}°C` : '—'}
                  </div>
                  <div className="text-xs text-neutral-600">
                    💧 {field.humidity != null ? `${field.humidity.toFixed(0)}%` : '—'}
                  </div>
                </div>
                <div className="text-xs text-neutral-500">
                  💨 {field.windSpeed != null ? `${field.windSpeed.toFixed(1)} м/с` : '—'}
                </div>
              </div>
            </div>
          ))}

          {fields.length > 4 && (
            <div className="text-center text-xs text-neutral-500 pt-2">
              +{fields.length - 4} полей
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-sm text-neutral-500 py-4">
          Нет данных о погоде на текущий час
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-neutral-200 text-xs text-neutral-500 text-center">
        Автообновление каждые 15 минут
      </div>
    </div>
  );
}
