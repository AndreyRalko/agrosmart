import { api } from '../client';
import type {
  IntegrationDataField,
  IntegrationDataFieldListResponse,
} from '@/lib/types/integration/integration-data-field';

export interface IntegrationDataFieldQueryParams {
  page?: number;
  page_size?: number;
  integration?: number;
  field?: number;
  time_from?: string;
  time_to?: string;
}

export interface IntegrationDataFieldLastParams {
  integration_id: number;
  field_id: number;
  dt: string;
}

export async function getIntegrationDataFields(
  params?: IntegrationDataFieldQueryParams
): Promise<IntegrationDataFieldListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
  if (params?.integration) queryParams.append('integration', params.integration.toString());
  if (params?.field) queryParams.append('field', params.field.toString());
  if (params?.time_from) queryParams.append('time_from', params.time_from);
  if (params?.time_to) queryParams.append('time_to', params.time_to);

  const qs = queryParams.toString();
  return api.get<IntegrationDataFieldListResponse>(`/integration-data-field/${qs ? `?${qs}` : ''}`);
}

export async function getIntegrationDataField(id: number): Promise<IntegrationDataField> {
  return api.get<IntegrationDataField>(`/integration-data-field/${id}/`);
}

export async function getLastIntegrationDataField(
  params: IntegrationDataFieldLastParams
): Promise<IntegrationDataField> {
  const queryParams = new URLSearchParams();
  queryParams.append('integration_id', params.integration_id.toString());
  queryParams.append('field_id', params.field_id.toString());
  queryParams.append('dt', params.dt);

  return api.get<IntegrationDataField>(`/integration-data-field/last/?${queryParams.toString()}`);
}