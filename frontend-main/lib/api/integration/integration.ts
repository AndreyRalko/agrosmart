import { api } from '../client';
import type { Integration, IntegrationDetail, IntegrationCreate, IntegrationUpdate, IntegrationListResponse } from '@/lib/types/integration/integration';

export async function getIntegrations(): Promise<IntegrationListResponse> {
  return api.get<IntegrationListResponse>('/integration/');
}

export async function getIntegration(id: number): Promise<IntegrationDetail> {
  return api.get<IntegrationDetail>(`/integration/${id}/`);
}

export async function createIntegration(data: IntegrationCreate): Promise<IntegrationDetail> {
  return api.post<IntegrationDetail>('/integration/', data);
}

export async function updateIntegration(id: number, data: IntegrationUpdate): Promise<IntegrationDetail> {
  return api.patch<IntegrationDetail>(`/integration/${id}/`, data);
}

export async function deleteIntegration(id: number): Promise<void> {
  return api.delete<void>(`/integration/${id}/`);
}

export type IntegrationTaskResult = {
  api_calls_ok?: number;
  api_calls_failed?: number;
  created_rows?: number;
};

export async function runIntegrationTask(id: number): Promise<{
  message: string;
  task_id: string;
  result?: IntegrationTaskResult;
}> {
  return api.post<{ message: string; task_id: string; result?: IntegrationTaskResult }>(
    `/integration/${id}/run-task/`,
    {},
  );
}