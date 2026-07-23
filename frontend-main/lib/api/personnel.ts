import { api } from './client';
import type { PersonnelListResponse, Personnel, UpdatePersonnelData, CreatePersonnelData } from '@/lib/types/personnel';

export async function getPersonnel(page_size: number = 10): Promise<PersonnelListResponse> {
  return api.get<PersonnelListResponse>(`/personal/?page_size=${page_size}`);
}

export async function createPersonnel(data: CreatePersonnelData): Promise<Personnel> {
  return api.put<Personnel>('/personal/', data);
}

export async function updatePersonnel(id: number, data: UpdatePersonnelData): Promise<Personnel> {
  console.log('UPDATE REQUEST:', JSON.stringify({ id, data }, null, 2));
  return api.patch<Personnel>(`/personal/${id}`, data);
}