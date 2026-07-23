import { api } from '../client';
import type { MachineryType, MachineryTypeCreate, MachineryTypeUpdate, MachineryTypeListResponse, MachineryTypeDetail } from '@/lib/types/machinery/type';

export async function getMachineryTypes(): Promise<MachineryType[] | MachineryTypeListResponse> {
  return api.get<MachineryType[] | MachineryTypeListResponse>('/machinery/type/');
}

export async function getMachineryType(id: number): Promise<MachineryTypeDetail> {
  return api.get<MachineryTypeDetail>(`/machinery/type/${id}/`);
}

export async function createMachineryType(data: MachineryTypeCreate): Promise<MachineryTypeDetail> {
  return api.post<MachineryTypeDetail>('/machinery/type/', data);
}

export async function updateMachineryType(id: number, data: MachineryTypeUpdate): Promise<MachineryTypeDetail> {
  return api.patch<MachineryTypeDetail>(`/machinery/type/${id}/`, data);
}

export async function deleteMachineryType(id: number): Promise<void> {
  return api.delete<void>(`/machinery/type/${id}/`);
}