import { api } from '../client';
import type { 
  IntegrationLog, 
  IntegrationLogListResponse 
} from '@/lib/types/integration/integration-log';

// Параметры запроса для фильтрации
export interface IntegrationLogQueryParams {
  page?: number;
  page_size?: number;
  integration?: number; // Фильтр по integration ID
  status?: -1 | 0 | 1; // Фильтр по статусу
  error_type?: string; // Фильтр по типу ошибки
  created_at_after?: string; // ISO datetime
  created_at_before?: string; // ISO datetime
}

// Получить список логов интеграции
export async function getIntegrationLogs(params?: IntegrationLogQueryParams): Promise<IntegrationLogListResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
  if (params?.integration) queryParams.append('integration', params.integration.toString());
  if (params?.status !== undefined) queryParams.append('status', params.status.toString());
  if (params?.error_type) queryParams.append('error_type', params.error_type);
  if (params?.created_at_after) queryParams.append('created_at_after', params.created_at_after);
  if (params?.created_at_before) queryParams.append('created_at_before', params.created_at_before);
  
  const queryString = queryParams.toString();
  const url = `/integration-logs/${queryString ? `?${queryString}` : ''}`;
  
  return api.get<IntegrationLogListResponse>(url);
}

// Получить детали лога по ID (если эндпоинт существует)
export async function getIntegrationLog(id: number): Promise<IntegrationLog> {
  return api.get<IntegrationLog>(`/integration-logs/${id}/`);
}