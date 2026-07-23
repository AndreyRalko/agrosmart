import { api } from '../client';
import type { Field, FieldCreate, FieldUpdate, FieldListResponse } from '@/lib/types/field/field';

export async function getFields(no?: string): Promise<FieldListResponse> {
  const params = no ? `?no=${encodeURIComponent(no)}` : '';
  return api.get<FieldListResponse>(`/field/${params}`);
}

export async function createField(data: FieldCreate): Promise<Field> {
  return api.post<Field>('/field/', data);
}

export async function updateField(id: number, data: FieldUpdate): Promise<Field> {
  return api.patch<Field>(`/field/${id}/`, data);
}

export async function deleteField(id: number): Promise<void> {
  return api.delete<void>(`/field/${id}/`);
}