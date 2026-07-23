import { api } from '../client';
import type { AnimalBreed, AnimalBreedDetail, AnimalBreedCreate, AnimalBreedUpdate, AnimalBreedListResponse } from '@/lib/types/animal/breed';

export async function getAnimalBreeds(): Promise<AnimalBreed[] | AnimalBreedListResponse> {
  return api.get<AnimalBreed[] | AnimalBreedListResponse>('/animal/breed/');
}

export async function getAnimalBreed(id: number): Promise<AnimalBreedDetail> {
  return api.get<AnimalBreedDetail>(`/animal/breed/${id}/`);
}

export async function createAnimalBreed(data: AnimalBreedCreate): Promise<AnimalBreedDetail> {
  return api.post<AnimalBreedDetail>('/animal/breed/', data);
}

export async function updateAnimalBreed(id: number, data: AnimalBreedUpdate): Promise<AnimalBreedDetail> {
  return api.patch<AnimalBreedDetail>(`/animal/breed/${id}/`, data);
}

export async function deleteAnimalBreed(id: number): Promise<void> {
  return api.delete<void>(`/animal/breed/${id}/`);
}