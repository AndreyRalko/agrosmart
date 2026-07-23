import { api } from './client';
import type { Position, PositionCreate, PositionUpdate, PositionListResponse } from '@/lib/types/position';

export async function getPositions(): Promise<Position[] | PositionListResponse> {
  return api.get<Position[] | PositionListResponse>('/position/');
}

export async function createPosition(data: PositionCreate): Promise<Position> {
  return api.post<Position>('/position/', data);
}

export async function updatePosition(id: number, data: PositionUpdate): Promise<Position> {
  return api.patch<Position>(`/position/${id}/`, data);
}

export async function deletePosition(id: number): Promise<void> {
  return api.delete<void>(`/position/${id}/`);
}