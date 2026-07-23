import type { ConditionValues } from '@/lib/types/agro-operations/condition';
import { formatMetricValueWithUnit, isFractionMetric } from '@/lib/constants/integration-metrics';

const CONDITION_OPERATOR_LABELS: Record<string, string> = {
  eq: 'равно',
  ne: 'не равно',
  gt: 'больше',
  gte: 'не меньше',
  lt: 'меньше',
  lte: 'не больше',
};

function normalizeConditionValue(metricKey: string | null | undefined, value: number): number {
  if (isFractionMetric(metricKey) && value > 1) {
    return value / 100;
  }
  return value;
}

export function defaultValueFromCondition(
  values: ConditionValues,
  metricKey?: string | null,
): string {
  if (values.eq != null) return String(normalizeConditionValue(metricKey, values.eq));
  if (values.gte != null && values.lte != null) {
    const low = normalizeConditionValue(metricKey, values.gte);
    const high = normalizeConditionValue(metricKey, values.lte);
    return String((low + high) / 2);
  }
  if (values.gte != null) return String(normalizeConditionValue(metricKey, values.gte));
  if (values.lte != null) return String(normalizeConditionValue(metricKey, values.lte));
  if (values.gt != null) return String(normalizeConditionValue(metricKey, values.gt));
  if (values.lt != null) return String(normalizeConditionValue(metricKey, values.lt));
  return '';
}

export function formatConditionRangeHint(
  values: ConditionValues,
  metricKey?: string | null,
): string {
  const parts = Object.entries(values).map(([op, val]) => {
    const label = CONDITION_OPERATOR_LABELS[op] ?? op;
    return `${label} ${formatMetricValueWithUnit(metricKey, val)}`;
  });
  return parts.join(', ');
}
