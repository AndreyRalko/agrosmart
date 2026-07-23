import { api } from '../client';

export interface OperationAlert {
  id: number;
  culture_variety: { id: number; name: string; };
  operation: { id: number; name: string; };
  code: string;
}

export interface AlertListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: OperationAlert[];
}

export async function getOperationAlerts(): Promise<AlertListResponse> {
  return api.get<AlertListResponse>('/agro-op/alert-operation-to-culture/');
}