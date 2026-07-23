export const INTEGRATION_METRIC_LABELS: Record<string, string> = {
  temperature_c: 'Температура, °C',
  humidity_percent: 'Влажность, %',
  wind_speed_m_s: 'Ветер, м/с',
  pressure_hpa: 'Давление, гПа',
  precipitation_probability_percent: 'Вероятность осадков, %',
  precipitation_intensity_mm_hr: 'Осадки, мм/ч',
  soilMoisture: 'Влажность почвы',
  soilMoisture10cm: 'Влажность почвы 10 см',
  soilMoisture40cm: 'Влажность почвы 40 см',
  soilMoisture100cm: 'Влажность почвы 100 см',
  soilTemperature: 'Температура почвы',
  soilTemperature10cm: 'Температура почвы 10 см',
  soilTemperature40cm: 'Температура почвы 40 см',
  soilTemperature100cm: 'Температура почвы 100 см',
};

const PROVIDER_COLUMNS: Record<string, string[]> = {
  'tomorrow.io': [
    'temperature_c',
    'humidity_percent',
    'wind_speed_m_s',
    'pressure_hpa',
    'precipitation_probability_percent',
    'precipitation_intensity_mm_hr',
  ],
  'stormglass.io': [
    'soilMoisture',
    'soilMoisture10cm',
    'soilMoisture40cm',
    'soilMoisture100cm',
    'soilTemperature',
    'soilTemperature10cm',
    'soilTemperature40cm',
    'soilTemperature100cm',
  ],
};

export const FRACTION_METRICS = new Set([
  'soilMoisture',
  'soilMoisture10cm',
  'soilMoisture40cm',
  'soilMoisture100cm',
]);

export function isFractionMetric(metricKey: string | null | undefined): boolean {
  return Boolean(metricKey && FRACTION_METRICS.has(metricKey));
}

export function formatMetricValueWithUnit(metricKey: string | null | undefined, value: string | number | null): string {
  if (value === null || value === undefined) return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  if (isFractionMetric(metricKey)) {
    const percent = (num * 100).toFixed(1).replace(/\.0$/, '');
    return `${num} (${percent}%)`;
  }
  return String(num);
}

export function getMetricInputHint(metricKey: string | null | undefined): string | null {
  if (isFractionMetric(metricKey)) {
    return 'Доля 0–1, как в Stormglass (0.4 = 40% влажности). Можно ввести и 40 — сохранится как 0.4.';
  }
  return null;
}

export function getMetricLabel(key: string): string {
  return INTEGRATION_METRIC_LABELS[key] ?? key;
}

export function formatIntegrationFieldLabel(field: {
  name: string;
  field_name?: string;
}): string {
  if (field.field_name) {
    const metricLabel = getMetricLabel(field.field_name);
    if (metricLabel !== field.field_name) {
      return metricLabel;
    }
    return `${field.name} (${field.field_name})`;
  }
  return field.name;
}

export function getColumnsForProvider(
  api: string | null | undefined,
  sampleData?: Record<string, unknown>,
): string[] {
  if (api && PROVIDER_COLUMNS[api]) {
    return PROVIDER_COLUMNS[api];
  }
  if (sampleData) {
    return Object.keys(sampleData).filter((k) => sampleData[k] != null);
  }
  return [];
}

export function formatMetricValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return String(value);
}
