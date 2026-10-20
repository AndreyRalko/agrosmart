import { ApiError } from '@/lib/api/client';
import { parseDrfError } from '@/lib/utils/drf-errors';
import type { NormField, NutritionNorm, RationFeed, RationNutrition } from '@/lib/types/ration/ration';

// ---- Показатели питательности ----

export type NutrientKey =
  | 'dry_matter' | 'energy' | 'protein' | 'fiber' | 'fat' | 'ndf' | 'starch' | 'calcium' | 'phosphorus';

/** Подписи и единицы — как в сообщениях Ration.get_deviations(). */
export const NUTRIENT_META: Record<NutrientKey, { label: string; unit: string; digits: number }> = {
  dry_matter: { label: 'Сухое вещество', unit: 'кг', digits: 2 },
  energy: { label: 'Обменная энергия', unit: 'МДж', digits: 1 },
  protein: { label: 'Сырой протеин', unit: 'кг', digits: 2 },
  fiber: { label: 'Клетчатка', unit: 'кг', digits: 2 },
  fat: { label: 'Жир', unit: 'кг', digits: 2 },
  ndf: { label: 'NDF', unit: 'кг', digits: 2 },
  starch: { label: 'Крахмал', unit: 'кг', digits: 2 },
  calcium: { label: 'Кальций', unit: 'г', digits: 1 },
  phosphorus: { label: 'Фосфор', unit: 'г', digits: 1 },
};

export const NUTRIENT_KEYS = Object.keys(NUTRIENT_META) as NutrientKey[];

export function hasNorm(key: NutrientKey): key is NormField {
  return key !== 'fat' && key !== 'starch';
}

export type RowNutrition = Record<NutrientKey, number> & { quantity: number; cost: number };

/**
 * Вклад одной строки состава. Формула повторяет Ration.get_nutrition()
 * (backend/ration/models.py:80-92): проценты делятся на 100, Ca и P переводятся
 * из кг в г (×1000), энергия — МДж/кг × кг. Итог от бэка (ration.nutrition) главнее.
 */
export function rationLineName(rf: RationFeed): string {
  return rf.storage_name || rf.feed.name;
}

export function rowNutrition(rf: RationFeed): RowNutrition {
  const q = Number(rf.quantity_kg) || 0;
  const f = rf.feed;
  const pct = (v: string) => (q * (Number(v) || 0)) / 100;
  return {
    quantity: q,
    dry_matter: pct(f.dry_matter),
    energy: q * (Number(f.energy) || 0),
    protein: pct(f.protein),
    fiber: pct(f.fiber),
    fat: pct(f.fat),
    ndf: pct(f.ndf),
    starch: pct(f.starch),
    calcium: pct(f.calcium) * 1000,
    phosphorus: pct(f.phosphorus) * 1000,
    cost: q * (Number(f.price_per_kg) || 0),
  };
}

// ---- Сравнение с нормой ----

export type NormStatus = 'none' | 'ok' | 'warn' | 'bad';

export interface NormCheck {
  status: NormStatus;
  /** Отклонение в процентах от ближайшей границы (со знаком: < 0 — ниже нормы). */
  deviationPct: number | null;
  min: number | null;
  max: number | null;
}

function toNum(v: string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Статус показателя относительно нормы: ok — в диапазоне или нормы нет,
 * warn — выход до 10 %, bad — больше 10 %.
 * В отличие от get_deviations() на бэке, граница 0 считается заданной.
 */
export function checkNorm(actual: number, norm: NutritionNorm | null, key: NutrientKey): NormCheck {
  if (!norm || !hasNorm(key)) return { status: 'none', deviationPct: null, min: null, max: null };
  const min = toNum(norm[`${key}_min`]);
  const max = toNum(norm[`${key}_max`]);
  if (min === null && max === null) return { status: 'none', deviationPct: null, min, max };

  let deviationPct = 0;
  if (min !== null && actual < min) {
    deviationPct = min > 0 ? -((1 - actual / min) * 100) : -100;
  } else if (max !== null && actual > max) {
    deviationPct = max > 0 ? (actual / max - 1) * 100 : 100;
  }
  const abs = Math.abs(deviationPct);
  const status: NormStatus = abs === 0 ? 'ok' : abs <= 10 ? 'warn' : 'bad';
  return { status, deviationPct: abs === 0 ? 0 : deviationPct, min, max };
}

export function formatNormRange(check: NormCheck, unit: string): string {
  const fmt = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  if (check.min !== null && check.max !== null) return `${fmt(check.min)}–${fmt(check.max)} ${unit}`;
  if (check.min !== null) return `не менее ${fmt(check.min)} ${unit}`;
  if (check.max !== null) return `не более ${fmt(check.max)} ${unit}`;
  return 'норма не задана';
}

/** Текст границ нормы по показателю, без сравнения с фактом. */
export function normBoundsText(norm: NutritionNorm, key: NormField, unit: string): string {
  const check: NormCheck = {
    status: 'ok',
    deviationPct: null,
    min: toNum(norm[`${key}_min`]),
    max: toNum(norm[`${key}_max`]),
  };
  return check.min === null && check.max === null ? '—' : formatNormRange(check, unit);
}

export const NORM_STATUS_COLOR: Record<NormStatus, string> = {
  none: '#16a34a',
  ok: '#16a34a',
  warn: '#f59e0b',
  bad: '#dc2626',
};

export const NORM_STATUS_LABEL: Record<NormStatus, string> = {
  none: 'Норма не задана',
  ok: 'В норме',
  warn: 'Отклонение до 10 %',
  bad: 'Отклонение более 10 %',
};

export function nutritionValue(n: RationNutrition, key: NutrientKey): number {
  return n[key];
}

// ---- Ошибки ----

/**
 * Текст ошибки для операций рационов. 500 бэк отдаёт HTML/текстом без деталей —
 * на известных сценариях (повторный корм в составе, удаление используемого корма)
 * это IntegrityError/ProtectedError, поэтому показываем понятное объяснение.
 */
export function rationErrorMessage(err: unknown, fallback: string, knownFields: string[] = []) {
  if (err instanceof ApiError && err.status >= 500) {
    return {
      message: 'Не удалось выполнить операцию — вероятно, корм уже используется / уже есть в составе.',
      fields: {} as Record<string, string>,
    };
  }
  return parseDrfError(err, knownFields, fallback);
}

// ---- Прочее ----

export const CURRENCY = '₸';

export function formatMoney(value: number | string | null | undefined): string {
  const n = Number(value);
  if (value === null || value === undefined || !Number.isFinite(n)) return '—';
  return `${n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${CURRENCY}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('ru-RU');
}

export function formatPeriod(start: string, end: string | null): string {
  return end ? `${formatDate(start)} – ${formatDate(end)}` : `с ${formatDate(start)}`;
}
