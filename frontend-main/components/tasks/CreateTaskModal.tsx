'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef, FormEvent } from 'react';
import { createTask, TaskConditionException } from '@/lib/api/tasks/task';
import { createTransportationTask } from '@/lib/api/agro-operations/operation';
import { getPersonnel } from '@/lib/api/personnel';
import { getCultures } from '@/lib/api/culture-operations/culture';
import { getVarietiesByCulture } from '@/lib/api/culture-operations/custom-variety';
import { getAgroOperation } from '@/lib/api/agro-operations/operation';
import { getByCultureVariety } from '@/lib/api/agro-operations/custom';
import { getFields } from '@/lib/api/field/field';
import { getMachinery } from '@/lib/api/machinery/machinery';
import { getLastIntegrationDataField } from '@/lib/api/integration/integration-data-field';
import { getIntegrations } from '@/lib/api/integration/integration';
import type { TaskCreate, TaskConditionError } from '@/lib/types/tasks/task';
import type { VarietyCustom } from '@/lib/types/culture-operations/custom-variety';
import type { ConditionValues } from '@/lib/types/agro-operations/condition';
import type { AgroField } from '@/lib/types/agro-operations/field';
import type { IntegrationDataField } from '@/lib/types/integration/integration-data-field';
import type { VarietyOperationField } from '@/lib/api/agro-operations/custom';
import { getMetricLabel, formatMetricValueWithUnit, isFractionMetric } from '@/lib/constants/integration-metrics';
import { defaultValueFromCondition, formatConditionRangeHint } from '@/lib/utils/condition-defaults';
import { getCurrentDt } from '@/lib/utils/datetime';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SelectOption {
  id: number;
  label: string;
}

interface LatLng { lat: number; lng: number; }
type PickingPoint = 'A' | 'B' | null;

interface WeatherConditionRule {
  integrationId: number;
  metricKey: string;
  label: string;
  values: ConditionValues;
}

function normalizeMetric(metricKey: string, value: number): number {
  if (isFractionMetric(metricKey) && value > 1) return value / 100;
  return value;
}

function normalizedCondition(metricKey: string, values: ConditionValues): ConditionValues {
  const normalized: ConditionValues = {};
  for (const [op, limit] of Object.entries(values) as Array<[keyof ConditionValues, number | undefined]>) {
    if (limit == null || Number.isNaN(Number(limit))) continue;
    normalized[op] = normalizeMetric(metricKey, Number(limit));
  }
  return normalized;
}

function valueMatchesCondition(value: number, values: ConditionValues): boolean {
  const checks: Array<[keyof ConditionValues, (current: number, limit: number) => boolean]> = [
    ['eq', (current, limit) => current === limit],
    ['ne', (current, limit) => current !== limit],
    ['gt', (current, limit) => current > limit],
    ['gte', (current, limit) => current >= limit],
    ['lt', (current, limit) => current < limit],
    ['lte', (current, limit) => current <= limit],
  ];
  return checks.every(([op, pass]) => {
    const limit = values[op];
    if (limit == null || Number.isNaN(Number(limit))) return true;
    return pass(value, Number(limit));
  });
}

function weatherRulesFromCultureFields(fields: VarietyOperationField[]): WeatherConditionRule[] {
  return fields.flatMap(field => {
    if (field.type !== 0) return [];
    const metricKey = field.integration_field?.field_name;
    const integrationId = field.integration?.id;
    const values = field.conditions?.[0]?.values;
    if (!metricKey || integrationId == null || !values || Object.keys(values).length === 0) {
      return [];
    }
    return [{
      integrationId,
      metricKey,
      label: field.name_ru || field.name || getMetricLabel(metricKey),
      values: normalizedCondition(metricKey, values),
    }];
  });
}

function getWeatherSuggestion(
  readings: Record<number, Record<string, number | null>>,
  rules: WeatherConditionRule[],
): { ok: boolean; text: string } | null {
  if (rules.length === 0) return null;
  const issues: string[] = [];
  for (const rule of rules) {
    const required = formatConditionRangeHint(rule.values, rule.metricKey);
    const raw = readings[rule.integrationId]?.[rule.metricKey];
    if (raw == null || Number.isNaN(Number(raw))) {
      issues.push(`${rule.label}: нет данных (требуется ${required})`);
      continue;
    }
    const value = normalizeMetric(rule.metricKey, Number(raw));
    if (!valueMatchesCondition(value, rule.values)) {
      issues.push(`${rule.label}: сейчас ${formatMetricValueWithUnit(rule.metricKey, value)}, требуется ${required}`);
    }
  }
  if (issues.length === 0) return { ok: true, text: 'Погодные условия благоприятны для проведения работ' };
  return { ok: false, text: `Неблагоприятные условия: ${issues.join('; ')}` };
}

const CONDITION_OPERATOR_LABELS: Record<string, string> = {
  eq: 'равно',
  ne: 'не равно',
  gt: 'больше',
  gte: 'не меньше',
  lt: 'меньше',
  lte: 'не больше',
};

function formatConditionLimits(condition: Record<string, string | number>, metricKey?: string | null): string {
  return Object.entries(condition)
    .map(([op, val]) => `${CONDITION_OPERATOR_LABELS[op] ?? op} ${formatMetricValueWithUnit(metricKey, val)}`)
    .join(', ');
}

function getConditionErrorMetricLabel(error: TaskConditionError): string | null {
  if (error.metric_label) return error.metric_label;
  if (error.metric_key) return getMetricLabel(error.metric_key);
  return null;
}

function getConditionErrorTitle(error: TaskConditionError): string {
  const metric = getConditionErrorMetricLabel(error);
  if (error.field_name && metric) {
    return `${error.field_name} — ${metric}`;
  }
  if (error.field_name) return error.field_name;
  if (metric) return metric;
  return `Параметр #${error.field_ref}`;
}

function formatConditionErrorMessage(error: TaskConditionError): string {
  const limits = formatConditionLimits(error.condition, error.metric_key);
  if (error.explain === 'none-check' || error.value == null) {
    return `нет данных с датчика (требуется: ${limits})`;
  }
  return `текущее значение ${formatMetricValueWithUnit(error.metric_key, error.value)}, требуется: ${limits}`;
}

export default function CreateTaskModal({ isOpen, onClose, onSuccess }: CreateTaskModalProps) {
  const [formData, setFormData] = useState({
    responsible: '',
    culture: '',
    culture_variety: '',
    operation: '',
    physical_field: '',
    deadline: '',
    note: '',
  });

  const [fieldValues, setFieldValues] = useState<Record<number, string>>({});
  const [personnel, setPersonnel] = useState<SelectOption[]>([]);
  const [cultures, setCultures] = useState<SelectOption[]>([]);
  const [fields, setFields] = useState<SelectOption[]>([]);
  const [machineryList, setMachineryList] = useState<SelectOption[]>([]);
  const [varietiesWithOps, setVarietiesWithOps] = useState<VarietyCustom[]>([]);
  const [varieties, setVarieties] = useState<SelectOption[]>([]);
  const [operations, setOperations] = useState<SelectOption[]>([]);
  const [manualFields, setManualFields] = useState<AgroField[]>([]);
  const [fieldConditionHints, setFieldConditionHints] = useState<Record<number, string>>({});
  const [isTransportation, setIsTransportation] = useState(false);
  const [weather, setWeather] = useState<IntegrationDataField | null>(null);
  const [sensorReadings, setSensorReadings] = useState<Record<number, Record<string, number | null>>>({});
  const [weatherRules, setWeatherRules] = useState<WeatherConditionRule[]>([]);
  const [weatherIntegrationId, setWeatherIntegrationId] = useState<number | null>(null);
  const [sensorIntegrationIds, setSensorIntegrationIds] = useState<number[]>([]);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingVarieties, setLoadingVarieties] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [conditionErrors, setConditionErrors] = useState<TaskConditionError[]>([]);

  // Transportation fields
  const [selectedMachinery, setSelectedMachinery] = useState('');
  const [fromName, setFromName] = useState('');
  const [toName, setToName] = useState('');
  const [pointA, setPointA] = useState<LatLng | null>(null);
  const [pointB, setPointB] = useState<LatLng | null>(null);
  const [picking, setPicking] = useState<PickingPoint>(null);
  const [transportDescription, setTransportDescription] = useState('');

  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerARef = useRef<any>(null);
  const markerBRef = useRef<any>(null);
  const pickingRef = useRef<PickingPoint>(null);

  useEffect(() => { pickingRef.current = picking; }, [picking]);

  useEffect(() => {
    if (!isOpen) return;
    loadInitialData();
  }, [isOpen]);

  useEffect(() => {
    if (isTransportation && isOpen) {
      initMap();
    } else {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
        markerARef.current = null;
        markerBRef.current = null;
      }
    }
  }, [isTransportation]);

  useEffect(() => {
    if (!formData.culture) {
      setVarietiesWithOps([]); setVarieties([]); setOperations([]);
      setManualFields([]); setFieldValues({});
      setFormData(prev => ({ ...prev, culture_variety: '', operation: '' }));
      return;
    }
    loadVarieties(Number(formData.culture));
  }, [formData.culture]);

  useEffect(() => {
    if (!formData.culture_variety) {
      setOperations([]); setManualFields([]); setFieldValues({});
      setFormData(prev => ({ ...prev, operation: '' }));
      return;
    }
    const found = varietiesWithOps.find(v => v.id === Number(formData.culture_variety));
    setOperations((found?.operations ?? []).map(o => ({ id: o.id, label: o.name_ru || o.name })));
    setManualFields([]); setFieldValues({});
    setFormData(prev => ({ ...prev, operation: '' }));
  }, [formData.culture_variety, varietiesWithOps]);

  useEffect(() => {
    if (!formData.operation || !formData.culture_variety) {
      setManualFields([]); setFieldValues({}); setFieldConditionHints({}); setWeatherRules([]); setIsTransportation(false);
      return;
    }
    loadOperationFields(Number(formData.operation), Number(formData.culture_variety));
  }, [formData.operation, formData.culture_variety]);

  useEffect(() => {
    if (!formData.physical_field || sensorIntegrationIds.length === 0) {
      setWeather(null);
      setSensorReadings({});
      return;
    }
    loadFieldSensors(Number(formData.physical_field));
  }, [formData.physical_field, sensorIntegrationIds]);

  const initMap = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (!mapContainerRef.current || mapRef.current) return;
    const L = (await import('leaflet')).default;
    const map = L.map(mapContainerRef.current).setView([51.1801, 71.4460], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    map.on('click', (e: any) => {
      const current = pickingRef.current;
      if (!current) return;
      const latlng: LatLng = { lat: e.latlng.lat, lng: e.latlng.lng };
      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;background:${current === 'A' ? '#1d4ed8' : '#dc2626'};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7], className: '',
      });
      if (current === 'A') {
        if (markerARef.current) markerARef.current.remove();
        markerARef.current = L.marker([latlng.lat, latlng.lng], { icon }).addTo(map).bindPopup('Точка А');
        setPointA(latlng);
      } else {
        if (markerBRef.current) markerBRef.current.remove();
        markerBRef.current = L.marker([latlng.lat, latlng.lng], { icon }).addTo(map).bindPopup('Точка Б');
        setPointB(latlng);
      }
      setPicking(null);
    });
    mapRef.current = map;
  };

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      const [personnelRes, culturesRes, fieldsRes, machineryRes, integrationsRes] = await Promise.all([
        getPersonnel(100),
        getCultures(),
        getFields(),
        getMachinery(),
        getIntegrations(),
      ]);
      setPersonnel(personnelRes.results.map(p => ({
        id: p.id,
        label: [p.lastname, p.firstname, p.patronymic].filter(Boolean).join(' '),
      })));
      setCultures((culturesRes.results || []).map(c => ({ id: c.id, label: c.name_ru || c.name })));
      setFields((fieldsRes.results || []).map(f => ({ id: f.id, label: `Поле №${f.no}` })));
      setMachineryList((machineryRes.results || []).map(m => ({ id: m.id, label: `${m.brand?.name ?? ''} ${m.gov_num}`.trim() })));
      const sensorIntegrations = (integrationsRes.results || []).filter(
        i => i.api === 'tomorrow.io' || i.api === 'stormglass.io',
      );
      setSensorIntegrationIds(sensorIntegrations.map(i => i.id));
      setWeatherIntegrationId(sensorIntegrations.find(i => i.api === 'tomorrow.io')?.id ?? null);
    } catch {
      setError('Ошибка загрузки данных');
    } finally {
      setLoadingData(false);
    }
  };

  const loadVarieties = async (cultureId: number) => {
    setLoadingVarieties(true);
    try {
      const res = await getVarietiesByCulture(cultureId);
      const list = res.results || [];
      setVarietiesWithOps(list);
      setVarieties(list.map(v => ({ id: v.id, label: v.name_ru || v.name })));
    } catch {
      setVarietiesWithOps([]); setVarieties([]);
    } finally {
      setLoadingVarieties(false);
    }
  };

  const loadOperationFields = async (operationId: number, cultureVarietyId: number) => {
    setLoadingFields(true);
    try {
      const [op, cultureData] = await Promise.all([
        getAgroOperation(operationId),
        getByCultureVariety(cultureVarietyId),
      ]);

      const cultureOp = cultureData.results.find(item => item.id === operationId);
      const finishFromCulture = (cultureOp?.fields ?? []).filter(
        field => field.type === 1 && field.conditions?.length > 0,
      );

      const manual = finishFromCulture
        .filter(field => !field.integration_field)
        .map(field => {
          const opField = op.fields?.find(item => item.id === field.id);
          return opField ?? {
            id: field.id,
            name: field.name,
            name_ru: field.name_ru,
            name_kk: field.name_kk,
            type: field.type,
            required: field.required,
            operation: operationId,
            integration: field.integration,
            integration_field: field.integration_field ?? null,
            conditions: [],
          };
        });

      const initial: Record<number, string> = {};
      const hints: Record<number, string> = {};

      finishFromCulture.forEach(field => {
        const condition = field.conditions[0];
        if (!condition) return;
        const metricKey = field.integration_field?.field_name ?? null;
        hints[field.id] = formatConditionRangeHint(condition.values, metricKey);
        if (!field.integration_field) {
          initial[field.id] = defaultValueFromCondition(condition.values, metricKey);
        }
      });

      setManualFields(manual);
      setFieldValues(initial);
      setFieldConditionHints(hints);
      setWeatherRules(weatherRulesFromCultureFields(cultureOp?.fields ?? []));
      setIsTransportation(!!op.is_transportation);
    } catch {
      setManualFields([]);
      setFieldConditionHints({});
      setWeatherRules([]);
      setIsTransportation(false);
    } finally {
      setLoadingFields(false);
    }
  };

  const loadFieldSensors = async (fieldId: number) => {
    if (sensorIntegrationIds.length === 0) {
      setWeather(null);
      setSensorReadings({});
      return;
    }
    setLoadingWeather(true);
    setWeather(null);
    setSensorReadings({});
    try {
      const dt = getCurrentDt();
      const rows = await Promise.all(sensorIntegrationIds.map(async (integrationId) => {
        try {
          const data = await getLastIntegrationDataField({
            integration_id: integrationId,
            field_id: fieldId,
            dt,
          });
          return [integrationId, data] as const;
        } catch {
          return [integrationId, null] as const;
        }
      }));
      const readings: Record<number, Record<string, number | null>> = {};
      let tomorrow: IntegrationDataField | null = null;
      for (const [integrationId, data] of rows) {
        if (!data) continue;
        readings[integrationId] = data.data as Record<string, number | null>;
        if (integrationId === weatherIntegrationId) tomorrow = data;
      }
      setSensorReadings(readings);
      setWeather(tomorrow);
    } finally {
      setLoadingWeather(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (conditionErrors.length) setConditionErrors([]);
  };

  const handleFieldValueChange = (fieldId: number, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
    if (conditionErrors.length) setConditionErrors([]);
  };

  const buildPayload = (isForce = false): TaskCreate => ({
    responsible: Number(formData.responsible),
    operation: Number(formData.operation),
    culture_variety: Number(formData.culture_variety),
    physical_field: Number(formData.physical_field),
    deadline: formData.deadline ? `${formData.deadline}T00:00:00` : '',
    note: formData.note || null,
    field_values_input: Object.entries(fieldValues)
      .filter(([, val]) => val !== '')
      .map(([id, val]) => ({ field_ref: Number(id), value_numeric: Number(val) })),
    ...(isForce && { is_force: true }),
  });

  const resetForm = () => {
    setFormData({ responsible: '', culture: '', culture_variety: '', operation: '', physical_field: '', deadline: '', note: '' });
    setVarietiesWithOps([]); setVarieties([]); setOperations([]);
    setManualFields([]); setFieldValues({}); setConditionErrors([]);
    setFieldConditionHints({});
    setError(''); setWeather(null); setSensorReadings({}); setWeatherRules([]); setIsTransportation(false);
    setSelectedMachinery(''); setFromName(''); setToName('');
    setPointA(null); setPointB(null); setPicking(null); setTransportDescription('');
    if (mapRef.current) {
      try { mapRef.current.remove(); } catch {}
      mapRef.current = null; markerARef.current = null; markerBRef.current = null;
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await submit(false);
  };

  const submit = async (isForce: boolean) => {
    if (isTransportation && (!pointA || !pointB)) {
      setError('Укажите точку А и точку Б на карте');
      return;
    }
    setLoading(true); setError(''); setConditionErrors([]);
    try {
      const task = await createTask(buildPayload(isForce));

      if (isTransportation && pointA && pointB) {
        await createTransportationTask({
          task: task.id,
          machinery: selectedMachinery ? Number(selectedMachinery) : null,
          from_place_name: fromName || null,
          from_place_x: pointA.lng,
          from_place_y: pointA.lat,
          to_place_name: toName || null,
          to_place_x: pointB.lng,
          to_place_y: pointB.lat,
          description: transportDescription || null,
        });
      }

      onSuccess(); onClose(); resetForm();
    } catch (err) {
      if (err instanceof TaskConditionException) {
        setConditionErrors(err.data.errors);
      } else {
        setError(err instanceof Error ? err.message : 'Ошибка создания задания');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => { resetForm(); onClose(); };

  if (!isOpen) return null;

  const isFormValid =
    formData.responsible && formData.culture_variety && formData.operation &&
    formData.physical_field && formData.deadline &&
    manualFields.filter(f => f.required).every(f => fieldValues[f.id] !== '') &&
    (!isTransportation || (pointA && pointB));

  const weatherData = weather?.data as Record<string, number | null> | undefined;
  const weatherSuggestion = formData.operation && !loadingFields && !loadingWeather
    ? getWeatherSuggestion(sensorReadings, weatherRules)
    : null;
  const formatWeatherTime = (iso: string) => new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">Создать задание</h2>
          <button onClick={handleClose} className="text-neutral-500 hover:text-neutral-900 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {error && <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-600 text-red-800 text-sm">{error}</div>}

          {conditionErrors.length > 0 && (
            <div className="mb-4 p-4 rounded" style={{ backgroundColor: '#fef9c3', border: '1px solid #ca8a04', color: '#713f12' }}>
              <p className="text-sm font-semibold mb-2">Нарушены условия для следующих показателей:</p>
              <ul className="text-sm space-y-1 mb-3">
                {conditionErrors.map((e, i) => (
                  <li key={i}>
                    <span className="font-medium">{getConditionErrorTitle(e)}</span>: {formatConditionErrorMessage(e)}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => submit(true)} disabled={loading}
                style={{ backgroundColor: '#ca8a04', color: '#fff' }}
                className="px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50">
                {loading ? 'Создание...' : 'Всё равно создать'}
              </button>
            </div>
          )}

          {loadingData ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-neutral-900" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Ответственный */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Ответственный <span className="text-red-500">*</span></label>
                <select name="responsible" value={formData.responsible} onChange={handleChange} required
                  className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors">
                  <option value="">Выберите сотрудника</option>
                  {personnel.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>

              {/* Поле */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Поле <span className="text-red-500">*</span></label>
                <select name="physical_field" value={formData.physical_field} onChange={handleChange} required
                  className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors">
                  <option value="">Выберите поле</option>
                  {fields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>

              {/* Погода */}
              {formData.physical_field && (
                <div>
                  {loadingWeather ? (
                    <div className="flex items-center gap-2 text-sm text-neutral-500 p-3 bg-neutral-50 border border-neutral-200">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-neutral-400" />
                      Загрузка погоды...
                    </div>
                  ) : weatherData ? (
                    <div className="p-3 bg-blue-50 border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Погода на поле</p>
                        <span className="text-xs text-blue-500">{weather && formatWeatherTime(weather.time)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {weatherData.temperature_c != null && <div className="text-center"><div className="text-lg font-semibold text-blue-900">{weatherData.temperature_c}°C</div><div className="text-xs text-blue-600">Температура</div></div>}
                        {weatherData.humidity_percent != null && <div className="text-center"><div className="text-lg font-semibold text-blue-900">{weatherData.humidity_percent}%</div><div className="text-xs text-blue-600">Влажность</div></div>}
                        {weatherData.wind_speed_m_s != null && <div className="text-center"><div className="text-lg font-semibold text-blue-900">{weatherData.wind_speed_m_s} м/с</div><div className="text-xs text-blue-600">Ветер</div></div>}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-neutral-50 border border-neutral-200 text-sm text-neutral-500">Нет данных о погоде для этого поля</div>
                  )}
                </div>
              )}

              {/* Культура */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Культура <span className="text-red-500">*</span></label>
                <select name="culture" value={formData.culture} onChange={handleChange} required
                  className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors">
                  <option value="">Выберите культуру</option>
                  {cultures.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>

              {/* Сорт */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Сорт <span className="text-red-500">*</span></label>
                <select name="culture_variety" value={formData.culture_variety} onChange={handleChange} required
                  disabled={!formData.culture || loadingVarieties}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors disabled:bg-neutral-50 disabled:text-neutral-400">
                  <option value="">{loadingVarieties ? 'Загрузка...' : !formData.culture ? 'Сначала выберите культуру' : varieties.length === 0 ? 'Нет сортов' : 'Выберите сорт'}</option>
                  {varieties.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
              </div>

              {/* Операция */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Операция <span className="text-red-500">*</span></label>
                <select name="operation" value={formData.operation} onChange={handleChange} required
                  disabled={!formData.culture_variety}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors disabled:bg-neutral-50 disabled:text-neutral-400">
                  <option value="">{!formData.culture_variety ? 'Сначала выберите сорт' : operations.length === 0 ? 'Нет операций' : 'Выберите операцию'}</option>
                  {operations.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>

              {weatherSuggestion && (
                <div className="flex items-start gap-2 px-3 py-2 text-sm font-medium"
                  style={weatherSuggestion.ok ? { backgroundColor: '#dcfce7', border: '1px solid #4ade80', color: '#14532d' } : { backgroundColor: '#ffedd5', border: '1px solid #fb923c', color: '#7c2d12' }}>
                  <span className="mt-0.5 shrink-0">{weatherSuggestion.ok ? '✓' : '⚠'}</span>
                  <span>{weatherSuggestion.text}</span>
                </div>
              )}

              {/* Ручные поля */}
              {loadingFields && (
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-neutral-400" />
                  Загрузка параметров...
                </div>
              )}

              {!loadingFields && manualFields.length > 0 && (
                <div className="space-y-3 p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Индикаторы выполнения</p>
                  {manualFields.map(field => (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        {field.name_ru || field.name}{field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {fieldConditionHints[field.id] && (
                        <p className="mb-1.5 text-xs text-neutral-500">
                          Условие по сорту: {fieldConditionHints[field.id]}
                        </p>
                      )}
                      <input type="number" step="any" value={fieldValues[field.id] ?? ''}
                        onChange={e => handleFieldValueChange(field.id, e.target.value)}
                        required={field.required}
                        className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                        placeholder="Введите значение" />
                    </div>
                  ))}
                </div>
              )}

              {/* Блок транспортировки */}
              {!loadingFields && isTransportation && (
                <div className="space-y-3 p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide flex items-center gap-1.5">
                    <span>🚛</span> Параметры транспортировки
                  </p>

                  {/* Техника */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Техника</label>
                    <select value={selectedMachinery} onChange={e => setSelectedMachinery(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors">
                      <option value="">Не выбрано</option>
                      {machineryList.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                  </div>

                  {/* Название мест */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5">Откуда (название)</label>
                      <input type="text" value={fromName} onChange={e => setFromName(e.target.value)}
                        placeholder="Например: Склад №1"
                        className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5">Куда (название)</label>
                      <input type="text" value={toName} onChange={e => setToName(e.target.value)}
                        placeholder="Например: Элеватор"
                        className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900" />
                    </div>
                  </div>

                  {/* Карта */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Маршрут <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2 mb-2">
                      <button type="button" onClick={() => setPicking(prev => prev === 'A' ? null : 'A')}
                        className="flex-1 py-2 text-xs font-medium border rounded transition-colors"
                        style={picking === 'A' ? { backgroundColor: '#1d4ed8', color: '#fff', borderColor: '#1d4ed8' }
                          : pointA ? { backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }
                          : { backgroundColor: '#fff', color: '#525252', borderColor: '#e5e7eb' }}>
                        {picking === 'A' ? '📍 Кликните на карту...' : pointA ? `✓ А: ${pointA.lat.toFixed(4)}, ${pointA.lng.toFixed(4)}` : '+ Точка А (откуда)'}
                      </button>
                      <button type="button" onClick={() => setPicking(prev => prev === 'B' ? null : 'B')}
                        className="flex-1 py-2 text-xs font-medium border rounded transition-colors"
                        style={picking === 'B' ? { backgroundColor: '#dc2626', color: '#fff', borderColor: '#dc2626' }
                          : pointB ? { backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }
                          : { backgroundColor: '#fff', color: '#525252', borderColor: '#e5e7eb' }}>
                        {picking === 'B' ? '📍 Кликните на карту...' : pointB ? `✓ Б: ${pointB.lat.toFixed(4)}, ${pointB.lng.toFixed(4)}` : '+ Точка Б (куда)'}
                      </button>
                    </div>
                    {picking && <p className="text-xs text-center mb-2 text-neutral-400">Активен режим выбора точки <strong>{picking}</strong> — кликните на карту</p>}
                    <div ref={mapContainerRef} className="w-full rounded border border-neutral-200"
                      style={{ height: '240px', cursor: picking ? 'crosshair' : 'grab' }} />
                  </div>

                  {/* Описание */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Описание</label>
                    <textarea value={transportDescription} onChange={e => setTransportDescription(e.target.value)} rows={2}
                      className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 resize-none"
                      placeholder="Дополнительная информация о маршруте..." />
                  </div>
                </div>
              )}

              {/* Срок */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Срок выполнения <span className="text-red-500">*</span></label>
                <input type="date" name="deadline" value={formData.deadline} onChange={handleChange} required
                  className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors" />
              </div>

              {/* Примечание */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Примечание</label>
                <textarea name="note" value={formData.note} onChange={handleChange} rows={3}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors resize-none"
                  placeholder="Дополнительная информация..." />
              </div>

              {/* Кнопки */}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={handleClose}
                  className="flex-1 px-4 py-2.5 border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
                  Отмена
                </button>
                <button type="submit" disabled={loading || !isFormValid}
                  className="flex-1 px-4 py-2.5 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors">
                  {loading ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}