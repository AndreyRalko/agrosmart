import { api } from '../client';
import type { MachineryBrand, MachineryBrandCreate, MachineryBrandUpdate, MachineryBrandListResponse } from '@/lib/types/machinery/brand';

export async function getMachineryBrands(): Promise<MachineryBrand[] | MachineryBrandListResponse> {
  return api.get<MachineryBrand[] | MachineryBrandListResponse>('/machinery/brand/');
}

export async function createMachineryBrand(data: MachineryBrandCreate): Promise<MachineryBrand> {
  return api.post<MachineryBrand>('/machinery/brand/', data);
}

export async function updateMachineryBrand(id: number, data: MachineryBrandUpdate): Promise<MachineryBrand> {
  return api.patch<MachineryBrand>(`/machinery/brand/${id}/`, data);
}

export async function deleteMachineryBrand(id: number): Promise<void> {
  return api.delete<void>(`/machinery/brand/${id}/`);
}