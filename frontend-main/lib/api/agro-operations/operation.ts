import { api } from '../client';
import type { 
  AgroOperation, 
  AgroOperationDetail,
  AgroOperationCreate, 
  AgroOperationUpdate,
  AgroOperationListResponse,
  TransportationTaskCreate
} from '@/lib/types/agro-operations/operation';

/**
 * Получить список агро операций (с полями, включая type и required)
 */
export async function getAgroOperations(): Promise<AgroOperationListResponse> {
  return api.get<AgroOperationListResponse>('/agro-op/operation/');
}

/**
 * Получить детальную информацию об операции
 */
export async function getAgroOperation(id: number): Promise<AgroOperationDetail> {
  return api.get<AgroOperationDetail>(`/agro-op/operation/${id}/`);
}

/**
 * Создать агро операцию
 */
export async function createAgroOperation(data: AgroOperationCreate): Promise<AgroOperationDetail> {
  return api.post<AgroOperationDetail>('/agro-op/operation/', data);
}

/**
 * Обновить агро операцию (partial update)
 */
export async function updateAgroOperation(id: number, data: AgroOperationUpdate): Promise<AgroOperationDetail> {
  return api.patch<AgroOperationDetail>(`/agro-op/operation/${id}/`, data);
}

/**
 * Удалить агро операцию
 */
export async function deleteAgroOperation(id: number): Promise<void> {
  return api.delete<void>(`/agro-op/operation/${id}/`);
}

export async function createTransportationOperation(operationId: number) {
  return api.post('/transportation/operation/', { operation: operationId });
}

export async function createTransportationTask(data: TransportationTaskCreate) {
  return api.post('/transportation/task/', data);
}