import { api } from '../client';
import type { 
  AgroField, 
  AgroFieldDetail,
  AgroFieldCreate, 
  AgroFieldUpdate,
  AgroFieldListResponse 
} from '@/lib/types/agro-operations/field';

/**
 * Получить список полей операций (теперь с type и required)
 */
export async function getAgroFields(): Promise<AgroFieldListResponse> {
  return api.get<AgroFieldListResponse>('/agro-op/field/');
}

/**
 * Получить детальную информацию о поле
 */
export async function getAgroField(id: number): Promise<AgroFieldDetail> {
  return api.get<AgroFieldDetail>(`/agro-op/field/${id}/`);
}

/**
 * Создать поле (теперь требует type и required)
 */
export async function createAgroField(data: AgroFieldCreate): Promise<AgroFieldDetail> {
  return api.post<AgroFieldDetail>('/agro-op/field/', data);
}

/**
 * Обновить поле операции (partial update)
 */
export async function updateAgroField(id: number, data: AgroFieldUpdate): Promise<AgroFieldDetail> {
  return api.patch<AgroFieldDetail>(`/agro-op/field/${id}/`, data);
}

/**
 * Удалить поле операции
 */
export async function deleteAgroField(id: number): Promise<void> {
  return api.delete<void>(`/agro-op/field/${id}/`);
}