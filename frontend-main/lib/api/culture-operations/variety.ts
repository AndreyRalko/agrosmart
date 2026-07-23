import { api } from '../client';
import type { Variety, VarietyDetail, VarietyCreate, VarietyUpdate, VarietyListResponse } from '@/lib/types/culture-operations/variety';

export async function getVarieties(): Promise<VarietyListResponse> {
  return api.get<VarietyListResponse>('/culture/variety/');
}

export async function getVariety(id: number): Promise<VarietyDetail> {
  return api.get<VarietyDetail>(`/culture/variety/${id}/`);
}

export async function createVariety(data: VarietyCreate): Promise<VarietyDetail> {
  return api.post<VarietyDetail>('/culture/variety/', data);
}

export async function updateVariety(id: number, data: VarietyUpdate): Promise<VarietyDetail> {
  return api.patch<VarietyDetail>(`/culture/variety/${id}/`, data);
}

export async function deleteVariety(id: number): Promise<void> {
  return api.delete<void>(`/culture/variety/${id}/`);
}