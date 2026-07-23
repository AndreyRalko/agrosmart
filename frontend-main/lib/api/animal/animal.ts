import { api } from '../client';
import type { Animal, AnimalCreate, AnimalUpdate, AnimalListResponse } from '@/lib/types/animal/animal';

export async function getAnimals(tag?: string): Promise<AnimalListResponse> {
  const params = tag ? `?tag=${encodeURIComponent(tag)}` : '';
  return api.get<AnimalListResponse>(`/animal/${params}`);
}

export async function createAnimal(data: AnimalCreate): Promise<Animal> {
  return api.post<Animal>('/animal/', data);
}

export async function updateAnimal(id: number, data: AnimalUpdate): Promise<Animal> {
  return api.patch<Animal>(`/animal/${id}/`, data);
}

export async function deleteAnimal(id: number): Promise<void> {
  return api.delete<void>(`/animal/${id}/`);
}