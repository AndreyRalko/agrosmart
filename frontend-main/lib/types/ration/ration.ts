// Типы раздела «Рацион кормления».
// Источник правды — backend/ration/models.py и backend/ration/serializers.py.
//
// DecimalField моделей приходят строками ("12.500"). Вычисляемые поля
// (nutrition, stats) считаются в Python и приходят числами (float).
// Пагинации нет: все списки — массивы.

export type RationType = 'dairy' | 'dry' | 'heifers' | 'calves' | 'bulls' | 'other';

// ---- Корм (FeedSerializer) ----

export const FEED_NUTRIENT_FIELDS = [
  'dry_matter', 'energy', 'protein', 'fiber', 'fat', 'ndf', 'starch', 'calcium', 'phosphorus',
] as const;
export type FeedNutrientField = typeof FEED_NUTRIENT_FIELDS[number];

/**
 * Значения — Decimal(6,3) строкой. Все показатели, кроме energy, — % от натуральной
 * массы; energy — МДж на 1 кг натуральной массы (так их трактует Ration.get_nutrition()).
 */
export type Feed = {
  id: number;
  name: string;
  price_per_kg: string;
  created_at: string;
} & Record<FeedNutrientField, string>;

export type FeedWrite = {
  name: string;
  price_per_kg?: string;
} & Partial<Record<FeedNutrientField, string>>;

// ---- Норма (NutritionNormSerializer, fields='__all__') ----

/** Показатели, для которых у нормы есть границы. Для fat и starch норм нет. */
export const NORM_FIELDS = [
  'dry_matter', 'energy', 'protein', 'fiber', 'ndf', 'calcium', 'phosphorus',
] as const;
export type NormField = typeof NORM_FIELDS[number];

type NormBounds = { [K in NormField as `${K}_min` | `${K}_max`]: string | null };

export type NutritionNorm = {
  id: number;
  /** Уникален: одна норма на тип рациона. */
  ration_type: RationType;
} & NormBounds;

export type NutritionNormWrite = {
  ration_type: RationType;
} & Partial<NormBounds>;

// ---- Строка состава (RationFeedSerializer) ----

export interface RationFeed {
  /** id строки состава — именно он идёт в /<ration_id>/feeds/<id>/, а не id корма. */
  id: number;
  feed: Feed;
  storage_id: number | null;
  storage_name: string | null;
  quantity_kg: string;
}

export interface RationFeedCreate {
  storage_id?: number;
  feed_id?: number;
  quantity_kg: string;
}

export interface RationStorageLine {
  storage_id: number;
  quantity_kg: string;
}

export type RationFeedUpdate = Partial<RationFeedCreate>;

// ---- Рацион (RationSerializer / RationWriteSerializer) ----

/** Ration.get_nutrition(): суммы на 1 голову в сутки. */
export interface RationNutrition {
  total_weight: number;   // кг
  dry_matter: number;     // кг
  energy: number;         // МДж
  protein: number;        // кг
  fiber: number;          // кг
  fat: number;            // кг
  ndf: number;            // кг
  starch: number;         // кг
  calcium: number;        // г
  phosphorus: number;     // г
  cost_per_head: number;
  cost_per_group_day: number;
  cost_per_group_30: number;
}

/** Ration.get_deviations(): только текст, без структурированных значений. */
export interface RationDeviation {
  nutrient: string;
  message: string;
}

export interface Ration {
  id: number;
  name: string;
  ration_type: RationType;
  /** id ОДНОГО животного (FK на animal.Animal), а не группы. Может быть null. */
  animal_group: number | null;
  /** Размер группы — от него считаются затраты на группу. */
  animal_count: number;
  date_start: string;
  date_end: string | null;
  notes: string;
  is_active: boolean;
  ration_feeds: RationFeed[];
  nutrition: RationNutrition;
  deviations: RationDeviation[];
  deviation_count: number;
  created_at: string;
}

export interface RationWrite {
  name: string;
  ration_type?: RationType;
  animal_group?: number | null;
  animal_count?: number;
  date_start: string;
  date_end?: string | null;
  notes?: string;
  /** Склады и килограммы на голову в сутки. Учитываются только при создании. */
  items?: RationStorageLine[];
  is_active?: boolean;
}

export interface RationNutritionResponse {
  nutrition: RationNutrition;
  norm: NutritionNorm | null;
  deviations: RationDeviation[];
  deviation_count: number;
}

export interface RationStats {
  active_rations: number;
  /** Фактически: активные рационы с привязанным животным (animal_group не null). */
  groups_on_feeding: number;
  avg_cost_per_head: number;
  total_cost_30_days: number;
  rations_with_deviations: number;
}

// ---- Графики (RationCostChartView / RationFeedStructureView) ----

/** GET /charts/costs/: только активные рационы, cost_per_head — ₸ на голову в сутки. */
export interface RationCostChartItem {
  id: number;
  name: string;
  cost_per_head: number;
}

/**
 * GET /charts/feed-structure/[?ration=<id>]: стоимость корма (quantity_kg × price_per_kg, ₸ на голову
 * в сутки), сложенная по названию корма и отсортированная по убыванию. Без ?ration — только активные
 * рационы; с ?ration — выбранный рацион, в том числе архивный.
 */
export interface RationFeedStructureItem {
  feed: string;
  cost: number;
}
