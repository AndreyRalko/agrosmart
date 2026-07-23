import { api } from '../client';
import type { Culture, CultureDetail, CultureCreate, CultureUpdate, CultureListResponse } from '@/lib/types/culture-operations/culture';

export async function getCultures(): Promise<CultureListResponse> {
  return api.get<CultureListResponse>('/culture/');
}

export async function getCulture(id: number): Promise<CultureDetail> {
  return api.get<CultureDetail>(`/culture/${id}/`);
}

export async function createCulture(data: CultureCreate): Promise<CultureDetail> {
  return api.post<CultureDetail>('/culture/', data);
}

export async function updateCulture(id: number, data: CultureUpdate): Promise<CultureDetail> {
  return api.patch<CultureDetail>(`/culture/${id}/`, data);
}

export async function deleteCulture(id: number): Promise<void> {
  return api.delete<void>(`/culture/${id}/`);
}