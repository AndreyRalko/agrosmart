import { api } from '../client';
import type { 
  Condition, 
  ConditionDetail,
  ConditionCreate, 
  ConditionUpdate,
  ConditionListResponse 
} from '@/lib/types/agro-operations/condition';

/**
 * Получить список условий
 */
export async function getConditions(): Promise<ConditionListResponse> {
  return api.get<ConditionListResponse>('/agro-op/condition/');
}

/**
 * Получить детальную информацию об условии
 */
export async function getCondition(id: number): Promise<ConditionDetail> {
  return api.get<ConditionDetail>(`/agro-op/condition/${id}/`);
}

/**
 * Создать условие
 */
export async function createCondition(data: ConditionCreate): Promise<ConditionDetail> {
  return api.post<ConditionDetail>('/agro-op/condition/', data);
}

/**
 * Обновить условие (partial update)
 */
export async function updateCondition(id: number, data: ConditionUpdate): Promise<ConditionDetail> {
  return api.patch<ConditionDetail>(`/agro-op/condition/${id}/`, data);
}

/**
 * Удалить условие
 */
export async function deleteCondition(id: number): Promise<void> {
  return api.delete<void>(`/agro-op/condition/${id}/`);
}