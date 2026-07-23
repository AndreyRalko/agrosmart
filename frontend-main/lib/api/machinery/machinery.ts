import { api } from '../client';
import type { Machinery, MachineryCreate, MachineryUpdate, MachineryListResponse } from '@/lib/types/machinery/machinery';

export async function getMachinery(gov_num?: string): Promise<MachineryListResponse> {
  const params = gov_num ? `?gov_num=${encodeURIComponent(gov_num)}` : '';
  return api.get<MachineryListResponse>(`/machinery/${params}`);
}

export async function createMachinery(data: MachineryCreate): Promise<Machinery> {
  return api.post<Machinery>('/machinery/', data);
}

export async function updateMachinery(id: number, data: MachineryUpdate): Promise<Machinery> {
  return api.patch<Machinery>(`/machinery/${id}/`, data);
}

export async function deleteMachinery(id: number): Promise<void> {
  return api.delete<void>(`/machinery/${id}/`);
}