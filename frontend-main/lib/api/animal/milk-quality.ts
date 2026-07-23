import { api } from '../client';
import type { MilkQuality, MilkQualityCreate, MilkQualityUpdate, MilkQualityListResponse } from '@/lib/types/animal/milk-quality';

export async function getMilkQualities(): Promise<MilkQualityListResponse> {
  return api.get<MilkQualityListResponse>('/animal/milk-quality/');
}

export async function createMilkQuality(data: MilkQualityCreate): Promise<MilkQuality> {
  return api.post<MilkQuality>('/animal/milk-quality/', data);
}

export async function updateMilkQuality(id: number, data: MilkQualityUpdate): Promise<MilkQuality> {
  return api.patch<MilkQuality>(`/animal/milk-quality/${id}/`, data);
}

export async function deleteMilkQuality(id: number): Promise<void> {
  return api.delete<void>(`/animal/milk-quality/${id}/`);
}