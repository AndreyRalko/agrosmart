import { api } from '../client';
import type { 
  IntegrationTemperature, 
  IntegrationTemperatureListResponse 
} from '@/lib/types/integration/integration-temperature';

export interface IntegrationTemperatureQueryParams {
  page?: number;
  integration?: number;
  field?: number;
  time_after?: string;
  time_before?: string;
  temperature_c_min?: number;
  temperature_c_max?: number;
}

export interface IntegrationTemperatureLastParams {
  integration_id: number;
  field_id: number;
  dt?: string;
}

export async function getIntegrationTemperatures(params?: IntegrationTemperatureQueryParams): Promise<IntegrationTemperatureListResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.integration) queryParams.append('integration', params.integration.toString());
  if (params?.field) queryParams.append('field', params.field.toString());
  if (params?.time_after) queryParams.append('time_after', params.time_after);
  if (params?.time_before) queryParams.append('time_before', params.time_before);
  if (params?.temperature_c_min !== undefined) queryParams.append('temperature_c_min', params.temperature_c_min.toString());
  if (params?.temperature_c_max !== undefined) queryParams.append('temperature_c_max', params.temperature_c_max.toString());
  
  const queryString = queryParams.toString();
  const url = `/integration-temperatures/${queryString ? `?${queryString}` : ''}`;
  
  return api.get<IntegrationTemperatureListResponse>(url);
}

export async function getIntegrationTemperature(id: number): Promise<IntegrationTemperature> {
  return api.get<IntegrationTemperature>(`/integration-temperatures/${id}/`);
}

export async function getLastIntegrationTemperature(
  params: IntegrationTemperatureLastParams
): Promise<IntegrationTemperature> {
  const queryParams = new URLSearchParams();
  queryParams.append('integration_id', params.integration_id.toString());
  queryParams.append('field_id', params.field_id.toString());
  if (params.dt) queryParams.append('dt', params.dt);

  return api.get<IntegrationTemperature>(`/integration-temperatures/last/?${queryParams.toString()}`);
}