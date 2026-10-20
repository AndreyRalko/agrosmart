import { api } from '../client';
import type {
  Feed,
  FeedWrite,
  NutritionNorm,
  NutritionNormWrite,
  Ration,
  RationCostChartItem,
  RationFeed,
  RationFeedCreate,
  RationFeedStructureItem,
  RationFeedUpdate,
  RationNutritionResponse,
  RationStats,
  RationType,
  RationWrite,
} from '@/lib/types/ration/ration';

// Пути сверены с backend/ration/urls.py. Все списки — массивы без пагинации.
const BASE = '/api/ration';

export const RATION_TYPE_LABELS: Record<RationType, string> = {
  dairy: 'Дойные коровы',
  dry: 'Сухостойные коровы',
  heifers: 'Нетели',
  calves: 'Телята',
  bulls: 'Быки',
  other: 'Другое',
};

// ---- Рационы ----

export function getRations(): Promise<Ration[]> {
  return api.get<Ration[]>(`${BASE}/`);
}

export function getRation(id: number): Promise<Ration> {
  return api.get<Ration>(`${BASE}/${id}/`);
}

export function createRation(data: RationWrite): Promise<Ration> {
  return api.post<Ration>(`${BASE}/`, data);
}

export function updateRation(id: number, data: Partial<RationWrite>): Promise<Ration> {
  return api.patch<Ration>(`${BASE}/${id}/`, data);
}

export function deleteRation(id: number): Promise<void> {
  return api.delete<void>(`${BASE}/${id}/`);
}

export function getRationStats(): Promise<RationStats> {
  return api.get<RationStats>(`${BASE}/stats/`);
}

export function getRationNutrition(id: number): Promise<RationNutritionResponse> {
  return api.get<RationNutritionResponse>(`${BASE}/${id}/nutrition/`);
}

// ---- Графики ----

/** Стоимость активных рационов, ₸/гол./сутки. */
export function getRationCostChart(): Promise<RationCostChartItem[]> {
  return api.get<RationCostChartItem[]>(`${BASE}/charts/costs/`);
}

/** Структура кормов по стоимости: без аргумента — активные рационы, с rationId — один рацион. */
export function getRationFeedStructure(rationId?: number): Promise<RationFeedStructureItem[]> {
  const query = rationId === undefined ? '' : `?ration=${rationId}`;
  return api.get<RationFeedStructureItem[]>(`${BASE}/charts/feed-structure/${query}`);
}

// ---- Состав рациона ----
// Все три вызова возвращают рацион целиком (DELETE — 204 без тела).

export function addRationFeed(rationId: number, data: RationFeedCreate): Promise<Ration> {
  return api.post<Ration>(`${BASE}/${rationId}/feeds/`, data);
}

/** rationFeedId — id строки состава (ration_feeds[].id), а не id корма. */
export function updateRationFeed(rationId: number, rationFeedId: number, data: RationFeedUpdate): Promise<Ration> {
  return api.patch<Ration>(`${BASE}/${rationId}/feeds/${rationFeedId}/`, data);
}

export function deleteRationFeed(rationId: number, rationFeedId: number): Promise<void> {
  return api.delete<void>(`${BASE}/${rationId}/feeds/${rationFeedId}/`);
}

// ---- Справочник кормов ----

export function getFeeds(): Promise<Feed[]> {
  return api.get<Feed[]>(`${BASE}/feeds/`);
}

export function createFeed(data: FeedWrite): Promise<Feed> {
  return api.post<Feed>(`${BASE}/feeds/`, data);
}

export function updateFeed(id: number, data: Partial<FeedWrite>): Promise<Feed> {
  return api.patch<Feed>(`${BASE}/feeds/${id}/`, data);
}

export function deleteFeed(id: number): Promise<void> {
  return api.delete<void>(`${BASE}/feeds/${id}/`);
}

// ---- Нормы (GET по id и DELETE на бэке нет) ----

export function getNorms(): Promise<NutritionNorm[]> {
  return api.get<NutritionNorm[]>(`${BASE}/norms/`);
}

export function createNorm(data: NutritionNormWrite): Promise<NutritionNorm> {
  return api.post<NutritionNorm>(`${BASE}/norms/`, data);
}

export function updateNorm(id: number, data: Partial<NutritionNormWrite>): Promise<NutritionNorm> {
  return api.patch<NutritionNorm>(`${BASE}/norms/${id}/`, data);
}

// ---- Копирование (на бэке нет атомарного эндпоинта) ----

export interface CopyRationResult {
  copy: Ration;
  /** Сколько строк состава удалось перенести. */
  copiedFeeds: number;
  /** Строка, на которой копирование остановилось; null — всё перенесено. */
  failedFeed: RationFeed | null;
  error: unknown;
}

/**
 * Копирует рацион: создаёт новый с теми же полями и «(копия)» в названии,
 * затем по одной добавляет строки состава. Это несколько запросов без транзакции:
 * при ошибке на середине копия остаётся созданной частично — вызывающий должен
 * сообщить об этом пользователю. Ошибка создания самой копии пробрасывается.
 */
export async function copyRation(source: Ration): Promise<CopyRationResult> {
  const suffix = ' (копия)';
  const copy = await createRation({
    name: `${source.name.slice(0, 255 - suffix.length)}${suffix}`,
    ration_type: source.ration_type,
    animal_group: source.animal_group,
    animal_count: source.animal_count,
    date_start: source.date_start,
    date_end: source.date_end,
    notes: source.notes,
    is_active: source.is_active,
  });

  let copiedFeeds = 0;
  for (const rf of source.ration_feeds) {
    try {
      await addRationFeed(copy.id, rf.storage_id
        ? { storage_id: rf.storage_id, quantity_kg: rf.quantity_kg }
        : { feed_id: rf.feed.id, quantity_kg: rf.quantity_kg });
      copiedFeeds += 1;
    } catch (error) {
      return { copy, copiedFeeds, failedFeed: rf, error };
    }
  }
  return { copy, copiedFeeds, failedFeed: null, error: null };
}
